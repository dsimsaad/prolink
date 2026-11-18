using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using ProLink.Api.Models;
using ProLink.Engine.Admin;
using ProLink.Engine.Rules;

namespace ProLink.Api.Data;

// PostgreSQL data access implementation for the Admin API.
// Security Note: DATABASE_URL connects via the Supabase session pooler as the database owner role (postgres),
// which has BYPASSRLS privileges and bypasses PostgreSQL Row Level Security. Therefore, every /admin endpoint
// MUST enforce authorization in C# via the "Admin" authorization policy before calling this repository.
// All SQL statements use parameterized NpgsqlCommand queries with zero string concatenation.
public sealed class AdminRepository : IAdminRepository
{
    private readonly string _connectionString;

    public AdminRepository(string connectionString)
    {
        _connectionString = connectionString ?? string.Empty;
    }

    private NpgsqlConnection CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("DATABASE_URL is not configured.");
        }
        return new NpgsqlConnection(_connectionString);
    }

    public async Task<AdminAuthRecord?> GetUserAuthRecordAsync(Guid userId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT p.id, p.role, COALESCE(p.is_suspended, false), pp.status, p.full_name
            FROM public.profiles p
            LEFT JOIN public.professional_profiles pp ON pp.profile_id = p.id
            WHERE p.id = @userId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return new AdminAuthRecord(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetBoolean(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4));
    }

    public async Task<IReadOnlyList<PendingApplicationRecord>> GetPendingApplicationsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT pp.profile_id, p.full_name, COALESCE(pp.years_experience, 0), pp.applied_at
            FROM public.professional_profiles pp
            JOIN public.profiles p ON p.id = pp.profile_id
            WHERE pp.status = 'pending'
            ORDER BY pp.applied_at ASC;";

        var results = new List<PendingApplicationRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new PendingApplicationRecord(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetInt32(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return results;
    }

    public async Task<IReadOnlyList<OpenReportRecord>> GetOpenReportsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, reason, status, created_at
            FROM public.reports
            WHERE status IN ('open', 'reviewing')
            ORDER BY created_at ASC;";

        var results = new List<OpenReportRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new OpenReportRecord(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return results;
    }

    public async Task<IReadOnlyList<DisputedJobRecord>> GetDisputedJobsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT j.id, j.title, COALESCE(a.name, 'Unknown Area'), j.updated_at
            FROM public.jobs j
            LEFT JOIN public.areas a ON a.id = j.area_id
            WHERE j.status = 'Disputed'
            ORDER BY j.updated_at ASC;";

        var results = new List<DisputedJobRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new DisputedJobRecord(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return results;
    }

    public async Task<IReadOnlyList<AuditEntry>> GetRecentAuditEntriesAsync(int maxRows = 5000, CancellationToken ct = default)
    {
        int safeLimit = maxRows < 1 ? 100 : (maxRows > 5000 ? 5000 : maxRows);
        const string sql = @"
            SELECT a.id, a.admin_id, COALESCE(p.full_name, 'Admin'), a.action, a.target_type, a.target_id, COALESCE(a.details::text, '{}'), a.created_at
            FROM public.admin_actions a
            LEFT JOIN public.profiles p ON p.id = a.admin_id
            ORDER BY a.created_at DESC
            LIMIT @maxRows;";

        var results = new List<AuditEntry>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("maxRows", safeLimit);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new AuditEntry(
                reader.GetGuid(0).ToString(),
                reader.GetGuid(1).ToString(),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetFieldValue<DateTimeOffset>(7)));
        }

        return results;
    }

    public async Task<IReadOnlyList<UserSearchEntry>> GetAllUsersForSearchAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, full_name, created_at
            FROM public.profiles
            ORDER BY created_at DESC;";

        var results = new List<UserSearchEntry>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new UserSearchEntry(
                reader.GetGuid(0).ToString(),
                reader.GetString(1),
                reader.GetFieldValue<DateTimeOffset>(2)));
        }

        return results;
    }

    public async Task<IReadOnlyList<JobSearchEntry>> GetAllJobsForSearchAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, title, description, created_at
            FROM public.jobs
            ORDER BY created_at DESC;";

        var results = new List<JobSearchEntry>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new JobSearchEntry(
                reader.GetGuid(0).ToString(),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }

        return results;
    }

    public async Task<IReadOnlyList<GroupJobCountRecord>> GetCategoryJobCountsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT c.id, c.name, COUNT(j.id)::int AS job_count
            FROM public.categories c
            LEFT JOIN public.jobs j ON j.category_id = c.id
            GROUP BY c.id, c.name;";

        var results = new List<GroupJobCountRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new GroupJobCountRecord(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetInt32(2)));
        }

        return results;
    }

    public async Task<IReadOnlyList<GroupJobCountRecord>> GetAreaJobCountsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT a.id, a.name, COUNT(j.id)::int AS job_count
            FROM public.areas a
            LEFT JOIN public.jobs j ON j.area_id = a.id
            GROUP BY a.id, a.name;";

        var results = new List<GroupJobCountRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            results.Add(new GroupJobCountRecord(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetInt32(2)));
        }

        return results;
    }

    public async Task<FunnelCountsRecord> GetFunnelCountsAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT
                COUNT(*) FILTER (WHERE status <> 'Draft')::int AS posted,
                COUNT(*) FILTER (WHERE status IN ('Offers received', 'Assigned', 'In progress', 'Completed', 'Disputed') OR EXISTS (SELECT 1 FROM public.offers o WHERE o.job_id = jobs.id))::int AS received_offers,
                COUNT(*) FILTER (WHERE status IN ('Assigned', 'In progress', 'Completed', 'Disputed') OR assigned_professional_id IS NOT NULL)::int AS assigned,
                COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed
            FROM public.jobs;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        if (!await reader.ReadAsync(ct))
        {
            return new FunnelCountsRecord(0, 0, 0, 0);
        }

        return new FunnelCountsRecord(
            reader.GetInt32(0),
            reader.GetInt32(1),
            reader.GetInt32(2),
            reader.GetInt32(3));
    }

    public async Task<JobStatusRecord?> GetJobStatusAsync(Guid jobId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, status
            FROM public.jobs
            WHERE id = @jobId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return new JobStatusRecord(reader.GetGuid(0), reader.GetString(1));
    }

    public async Task TransitionJobWithAuditAsync(
        Guid jobId,
        string fromStatus,
        string toStatus,
        Guid adminId,
        string note,
        string auditAction,
        string auditDetailsJson,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = @toStatus,
                updated_at = now()
            WHERE id = @jobId;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, @toStatus, @adminId, @note, now());";

        const string insertAuditSql = @"
            INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, details, created_at)
            VALUES (@adminId, @auditAction, 'job', @targetId, @details::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using (var updateCmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            updateCmd.Parameters.AddWithValue("toStatus", toStatus);
            updateCmd.Parameters.AddWithValue("jobId", jobId);
            await updateCmd.ExecuteNonQueryAsync(ct);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", fromStatus);
            eventCmd.Parameters.AddWithValue("toStatus", toStatus);
            eventCmd.Parameters.AddWithValue("adminId", adminId);
            eventCmd.Parameters.AddWithValue("note", note);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        await using (var auditCmd = new NpgsqlCommand(insertAuditSql, conn, tx))
        {
            auditCmd.Parameters.AddWithValue("adminId", adminId);
            auditCmd.Parameters.AddWithValue("auditAction", auditAction);
            auditCmd.Parameters.AddWithValue("targetId", jobId.ToString());
            auditCmd.Parameters.Add(new NpgsqlParameter("details", NpgsqlDbType.Jsonb) { Value = auditDetailsJson });
            await auditCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
    }

    public async Task<bool> IsActiveCategoryAsync(long categoryId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT EXISTS (
                SELECT 1
                FROM public.categories
                WHERE id = @categoryId
                  AND is_active = true
            );";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("categoryId", categoryId);
        object? result = await cmd.ExecuteScalarAsync(ct);
        return result is true;
    }

    public async Task<bool> AreaExistsAsync(long areaId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT EXISTS (
                SELECT 1
                FROM public.areas
                WHERE id = @areaId
            );";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("areaId", areaId);
        object? result = await cmd.ExecuteScalarAsync(ct);
        return result is true;
    }

    public async Task<IReadOnlyList<ActiveCategoryRecord>> GetActiveCategoriesAsync(CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, name
            FROM public.categories
            WHERE is_active = true
            ORDER BY name ASC;";

        var items = new List<ActiveCategoryRecord>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            items.Add(new ActiveCategoryRecord(reader.GetInt64(0), reader.GetString(1)));
        }

        return items;
    }

    public async Task<CustomerJobRecord?> GetCustomerJobAsync(Guid jobId, Guid customerId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, customer_id, title, description, category_id, area_id,
                   budget_min, budget_max, urgency, status, assigned_professional_id,
                   expires_at, created_at, updated_at, work_started_at, professional_marked_done_at
            FROM public.jobs
            WHERE id = @jobId
              AND customer_id = @customerId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);
        cmd.Parameters.AddWithValue("customerId", customerId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadCustomerJobRecord(reader);
    }

    public async Task<CustomerJobRecord> CreateCustomerJobAsync(
        Guid customerId,
        string title,
        string description,
        long categoryId,
        long areaId,
        decimal? budgetMin,
        decimal? budgetMax,
        string urgency,
        bool publish,
        DateTimeOffset? expiresAt,
        CancellationToken ct = default)
    {
        string targetStatus = publish ? JobStateMachine.Open : JobStateMachine.Draft;
        string eventNote = publish ? "Job published" : "Saved as draft";

        const string insertJobSql = @"
            INSERT INTO public.jobs (
                customer_id, title, description, category_id, area_id,
                budget_min, budget_max, urgency, status, expires_at, created_at, updated_at
            )
            VALUES (
                @customerId, @title, @description, @categoryId, @areaId,
                @budgetMin, @budgetMax, @urgency, @status, @expiresAt, now(), now()
            )
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, NULL, @toStatus, @actorId, @note, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord created;
        await using (var cmd = new NpgsqlCommand(insertJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("customerId", customerId);
            cmd.Parameters.AddWithValue("title", title);
            cmd.Parameters.AddWithValue("description", description);
            cmd.Parameters.AddWithValue("categoryId", categoryId);
            cmd.Parameters.AddWithValue("areaId", areaId);
            cmd.Parameters.AddWithValue("budgetMin", (object?)budgetMin ?? DBNull.Value);
            cmd.Parameters.AddWithValue("budgetMax", (object?)budgetMax ?? DBNull.Value);
            cmd.Parameters.AddWithValue("urgency", urgency);
            cmd.Parameters.AddWithValue("status", targetStatus);
            cmd.Parameters.AddWithValue("expiresAt", (object?)expiresAt ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            created = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", created.Id);
            eventCmd.Parameters.AddWithValue("toStatus", targetStatus);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            eventCmd.Parameters.AddWithValue("note", eventNote);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return created;
    }

    public async Task<CustomerJobRecord> UpdateDraftJobAsync(
        Guid jobId,
        Guid customerId,
        string title,
        string description,
        long categoryId,
        long areaId,
        decimal? budgetMin,
        decimal? budgetMax,
        string urgency,
        CancellationToken ct = default)
    {
        const string updateSql = @"
            UPDATE public.jobs
            SET title = @title,
                description = @description,
                category_id = @categoryId,
                area_id = @areaId,
                budget_min = @budgetMin,
                budget_max = @budgetMax,
                urgency = @urgency,
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
              AND status = 'Draft'
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(updateSql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);
        cmd.Parameters.AddWithValue("customerId", customerId);
        cmd.Parameters.AddWithValue("title", title);
        cmd.Parameters.AddWithValue("description", description);
        cmd.Parameters.AddWithValue("categoryId", categoryId);
        cmd.Parameters.AddWithValue("areaId", areaId);
        cmd.Parameters.AddWithValue("budgetMin", (object?)budgetMin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("budgetMax", (object?)budgetMax ?? DBNull.Value);
        cmd.Parameters.AddWithValue("urgency", urgency);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        return ReadCustomerJobRecord(reader);
    }

    public async Task<CustomerJobRecord> PublishCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        DateTimeOffset expiresAt,
        CancellationToken ct = default)
    {
        const string updateSql = @"
            UPDATE public.jobs
            SET status = 'Open',
                expires_at = @expiresAt,
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, 'Draft', 'Open', @actorId, 'Job published', now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("customerId", customerId);
            cmd.Parameters.AddWithValue("expiresAt", expiresAt);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<CustomerJobRecord> CancelCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string? reason,
        CancellationToken ct = default)
    {
        const string rejectOffersSql = @"
            UPDATE public.offers
            SET status = 'rejected',
                updated_at = now()
            WHERE job_id = @jobId
              AND status = 'pending';";

        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'Cancelled',
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, 'Cancelled', @actorId, @note, now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'job_status_changed', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using (var rejectCmd = new NpgsqlCommand(rejectOffersSql, conn, tx))
        {
            rejectCmd.Parameters.AddWithValue("jobId", jobId);
            await rejectCmd.ExecuteNonQueryAsync(ct);
        }

        CustomerJobRecord updated;
        await using (var jobCmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            jobCmd.Parameters.AddWithValue("jobId", jobId);
            jobCmd.Parameters.AddWithValue("customerId", customerId);
            await using var reader = await jobCmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", fromStatus);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            eventCmd.Parameters.AddWithValue("note", (object?)reason ?? DBNull.Value);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        if (assignedProfessionalId.HasValue)
        {
            string payloadJson = JsonSerializer.Serialize(new
            {
                job_id = jobId,
                title = jobTitle,
                status = JobStateMachine.Cancelled,
            });

            await using var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx);
            notifCmd.Parameters.AddWithValue("userId", assignedProfessionalId.Value);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<JobOfferRecord?> GetJobOfferAsync(Guid jobId, Guid offerId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, job_id, professional_id, status, price, COALESCE(inspection_fee, 0), eta_minutes
            FROM public.offers
            WHERE id = @offerId
              AND job_id = @jobId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("offerId", offerId);
        cmd.Parameters.AddWithValue("jobId", jobId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return new JobOfferRecord(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetGuid(2),
            reader.GetString(3),
            reader.GetDecimal(4),
            reader.GetDecimal(5),
            reader.GetInt32(6));
    }

    public async Task<AcceptOfferResult> AcceptOfferAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        string jobTitle,
        Guid offerId,
        Guid professionalId,
        CancellationToken ct = default)
    {
        const string acceptOfferSql = @"
            UPDATE public.offers
            SET status = 'accepted',
                updated_at = now()
            WHERE id = @offerId
              AND job_id = @jobId;";

        const string rejectOthersSql = @"
            UPDATE public.offers
            SET status = 'rejected',
                updated_at = now()
            WHERE job_id = @jobId
              AND id <> @offerId
              AND status = 'pending'
            RETURNING professional_id;";

        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'Assigned',
                assigned_professional_id = @professionalId,
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
            RETURNING updated_at;";

        const string upsertConversationSql = @"
            INSERT INTO public.conversations (job_id, customer_id, professional_id, created_at)
            VALUES (@jobId, @customerId, @professionalId, now())
            ON CONFLICT (job_id) DO UPDATE
            SET professional_id = EXCLUDED.professional_id
            RETURNING id;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, 'Assigned', @actorId, 'Offer accepted by customer', now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, @type, @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using (var acceptCmd = new NpgsqlCommand(acceptOfferSql, conn, tx))
        {
            acceptCmd.Parameters.AddWithValue("offerId", offerId);
            acceptCmd.Parameters.AddWithValue("jobId", jobId);
            await acceptCmd.ExecuteNonQueryAsync(ct);
        }

        var rejectedPros = new List<Guid>();
        await using (var rejectCmd = new NpgsqlCommand(rejectOthersSql, conn, tx))
        {
            rejectCmd.Parameters.AddWithValue("jobId", jobId);
            rejectCmd.Parameters.AddWithValue("offerId", offerId);
            await using var reader = await rejectCmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                rejectedPros.Add(reader.GetGuid(0));
            }
        }

        DateTimeOffset updatedAt;
        await using (var jobCmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            jobCmd.Parameters.AddWithValue("jobId", jobId);
            jobCmd.Parameters.AddWithValue("customerId", customerId);
            jobCmd.Parameters.AddWithValue("professionalId", professionalId);
            object? scalar = await jobCmd.ExecuteScalarAsync(ct);
            updatedAt = scalar is DateTimeOffset dto ? dto : DateTimeOffset.UtcNow;
        }

        Guid conversationId;
        await using (var convCmd = new NpgsqlCommand(upsertConversationSql, conn, tx))
        {
            convCmd.Parameters.AddWithValue("jobId", jobId);
            convCmd.Parameters.AddWithValue("customerId", customerId);
            convCmd.Parameters.AddWithValue("professionalId", professionalId);
            object? scalar = await convCmd.ExecuteScalarAsync(ct);
            conversationId = scalar is Guid g ? g : Guid.Empty;
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", fromStatus);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        string acceptedPayload = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            offer_id = offerId,
            title = jobTitle,
            status = JobStateMachine.Assigned,
        });

        await using (var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx))
        {
            notifCmd.Parameters.AddWithValue("userId", professionalId);
            notifCmd.Parameters.AddWithValue("type", "offer_accepted");
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = acceptedPayload });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        for (int i = 0; i < rejectedPros.Count; i++)
        {
            string rejectedPayload = JsonSerializer.Serialize(new
            {
                job_id = jobId,
                title = jobTitle,
                status = "Offer not selected",
            });

            await using var rejNotifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx);
            rejNotifCmd.Parameters.AddWithValue("userId", rejectedPros[i]);
            rejNotifCmd.Parameters.AddWithValue("type", "job_status_changed");
            rejNotifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = rejectedPayload });
            await rejNotifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

        return new AcceptOfferResult(
            jobId,
            fromStatus,
            JobStateMachine.Assigned,
            offerId,
            professionalId,
            conversationId,
            rejectedPros,
            updatedAt);
    }

    public async Task<CustomerJobRecord> CompleteCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        Guid? assignedProfessionalId,
        string jobTitle,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'Completed',
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, 'In progress', 'Completed', @actorId, 'Customer confirmed job completion', now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'job_status_changed', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("customerId", customerId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        if (assignedProfessionalId.HasValue)
        {
            string payloadJson = JsonSerializer.Serialize(new
            {
                job_id = jobId,
                title = jobTitle,
                status = JobStateMachine.Completed,
            });

            await using var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx);
            notifCmd.Parameters.AddWithValue("userId", assignedProfessionalId.Value);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<CustomerJobRecord> DisputeCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string reason,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'Disputed',
                updated_at = now()
            WHERE id = @jobId
              AND customer_id = @customerId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, 'Disputed', @actorId, @note, now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'job_status_changed', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("customerId", customerId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", fromStatus);
            eventCmd.Parameters.AddWithValue("actorId", customerId);
            eventCmd.Parameters.AddWithValue("note", reason);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        if (assignedProfessionalId.HasValue)
        {
            string payloadJson = JsonSerializer.Serialize(new
            {
                job_id = jobId,
                title = jobTitle,
                status = JobStateMachine.Disputed,
            });

            await using var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx);
            notifCmd.Parameters.AddWithValue("userId", assignedProfessionalId.Value);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<bool> HasReviewForJobAsync(Guid jobId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT EXISTS (
                SELECT 1
                FROM public.reviews
                WHERE job_id = @jobId
            );";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);
        object? scalar = await cmd.ExecuteScalarAsync(ct);
        return scalar is true;
    }

    public async Task<ReviewRecord> CreateReviewAsync(
        Guid jobId,
        Guid reviewerId,
        Guid professionalId,
        int rating,
        string? comment,
        CancellationToken ct = default)
    {
        const string insertSql = @"
            INSERT INTO public.reviews (job_id, reviewer_id, professional_id, rating, comment, created_at)
            VALUES (@jobId, @reviewerId, @professionalId, @rating, @comment, now())
            RETURNING id, job_id, reviewer_id, professional_id, rating, comment, created_at;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        ReviewRecord review;
        await using (var cmd = new NpgsqlCommand(insertSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("reviewerId", reviewerId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            cmd.Parameters.AddWithValue("rating", rating);
            cmd.Parameters.AddWithValue("comment", (object?)comment ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            review = new ReviewRecord(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetGuid(2),
                reader.GetGuid(3),
                reader.GetInt32(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetFieldValue<DateTimeOffset>(6));
        }

        await tx.CommitAsync(ct);
        return review;
    }

    public async Task<IReadOnlyList<Guid>> FindMatchingProfessionalsAsync(
        long categoryId,
        long areaId,
        Guid excludeCustomerId,
        int limit,
        CancellationToken ct = default)
    {
        int safeLimit = limit < 1 ? 5 : (limit > 20 ? 20 : limit);
        const string sql = @"
            SELECT pp.profile_id
            FROM public.professional_profiles pp
            JOIN public.profiles p ON p.id = pp.profile_id
            JOIN public.professional_skills ps ON ps.professional_id = pp.profile_id AND ps.category_id = @categoryId
            JOIN public.professional_areas pa ON pa.professional_id = pp.profile_id AND pa.area_id = @areaId
            WHERE pp.status = 'approved'
              AND pp.availability = 'available'
              AND COALESCE(p.is_suspended, false) = false
              AND pp.profile_id <> @excludeCustomerId
            ORDER BY COALESCE(pp.avg_rating_bayes, 0) DESC, pp.applied_at ASC
            LIMIT @limit;";

        var ids = new List<Guid>();
        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("categoryId", categoryId);
        cmd.Parameters.AddWithValue("areaId", areaId);
        cmd.Parameters.AddWithValue("excludeCustomerId", excludeCustomerId);
        cmd.Parameters.AddWithValue("limit", safeLimit);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    public async Task InsertJobMatchNotificationsAsync(
        Guid jobId,
        string jobTitle,
        string urgency,
        IReadOnlyList<Guid> professionalIds,
        CancellationToken ct = default)
    {
        if (professionalIds.Count == 0)
        {
            return;
        }

        const string insertSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'new_job_match', @payload::jsonb, now());";

        string payloadJson = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            title = jobTitle,
            urgency,
        });

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        for (int i = 0; i < professionalIds.Count; i++)
        {
            await using var cmd = new NpgsqlCommand(insertSql, conn, tx);
            cmd.Parameters.AddWithValue("userId", professionalIds[i]);
            cmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
    }

    public async Task<CustomerJobRecord?> GetJobByIdAsync(Guid jobId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, customer_id, title, description, category_id, area_id,
                   budget_min, budget_max, urgency, status, assigned_professional_id,
                   expires_at, created_at, updated_at, work_started_at, professional_marked_done_at
            FROM public.jobs
            WHERE id = @jobId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadCustomerJobRecord(reader);
    }

    public async Task<CustomerJobRecord?> GetAssignedProfessionalJobAsync(
        Guid jobId,
        Guid professionalId,
        CancellationToken ct = default)
    {
        const string sql = @"
            SELECT id, customer_id, title, description, category_id, area_id,
                   budget_min, budget_max, urgency, status, assigned_professional_id,
                   expires_at, created_at, updated_at, work_started_at, professional_marked_done_at
            FROM public.jobs
            WHERE id = @jobId
              AND assigned_professional_id = @professionalId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);
        cmd.Parameters.AddWithValue("professionalId", professionalId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadCustomerJobRecord(reader);
    }

    public async Task<bool> ProfessionalHasCategorySkillAsync(
        Guid professionalId,
        long categoryId,
        CancellationToken ct = default)
    {
        const string sql = @"
            SELECT EXISTS (
                SELECT 1
                FROM public.professional_skills
                WHERE professional_id = @professionalId
                  AND category_id = @categoryId
            );";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("professionalId", professionalId);
        cmd.Parameters.AddWithValue("categoryId", categoryId);
        object? result = await cmd.ExecuteScalarAsync(ct);
        return result is true;
    }

    public async Task<ProfessionalOfferRecord?> GetProfessionalOfferForJobAsync(
        Guid jobId,
        Guid professionalId,
        CancellationToken ct = default)
    {
        const string sql = @"
            SELECT o.id, o.job_id, o.professional_id, o.price, COALESCE(o.inspection_fee, 0),
                   COALESCE(o.eta_minutes, 0), o.message, o.status,
                   j.status, j.expires_at, j.customer_id, j.title,
                   o.created_at, o.updated_at
            FROM public.offers o
            JOIN public.jobs j ON j.id = o.job_id
            WHERE o.job_id = @jobId
              AND o.professional_id = @professionalId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("jobId", jobId);
        cmd.Parameters.AddWithValue("professionalId", professionalId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadProfessionalOfferRecord(reader);
    }

    public async Task<ProfessionalOfferRecord?> GetProfessionalOfferByIdAsync(
        Guid offerId,
        Guid professionalId,
        CancellationToken ct = default)
    {
        const string sql = @"
            SELECT o.id, o.job_id, o.professional_id, o.price, COALESCE(o.inspection_fee, 0),
                   COALESCE(o.eta_minutes, 0), o.message, o.status,
                   j.status, j.expires_at, j.customer_id, j.title,
                   o.created_at, o.updated_at
            FROM public.offers o
            JOIN public.jobs j ON j.id = o.job_id
            WHERE o.id = @offerId
              AND o.professional_id = @professionalId
            LIMIT 1;";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("offerId", offerId);
        cmd.Parameters.AddWithValue("professionalId", professionalId);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadProfessionalOfferRecord(reader);
    }

    public async Task<ProfessionalOfferRecord> CreateProfessionalOfferAsync(
        Guid jobId,
        Guid professionalId,
        string professionalName,
        Guid customerId,
        string jobTitle,
        string currentJobStatus,
        string targetJobStatus,
        decimal price,
        decimal inspectionFee,
        int etaMinutes,
        string? message,
        CancellationToken ct = default)
    {
        const string insertOfferSql = @"
            INSERT INTO public.offers (
                job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at, updated_at
            )
            VALUES (
                @jobId, @professionalId, @price, @inspectionFee, @etaMinutes, @message, 'pending', now(), now()
            )
            RETURNING id, created_at, updated_at;";

        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = @targetJobStatus,
                updated_at = now()
            WHERE id = @jobId;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, @toStatus, @actorId, @note, now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'offer_received', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        Guid offerId;
        DateTimeOffset createdAt;
        DateTimeOffset updatedAt;

        await using (var cmd = new NpgsqlCommand(insertOfferSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            cmd.Parameters.AddWithValue("price", price);
            cmd.Parameters.AddWithValue("inspectionFee", inspectionFee);
            cmd.Parameters.AddWithValue("etaMinutes", etaMinutes);
            cmd.Parameters.AddWithValue("message", (object?)message ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            offerId = reader.GetGuid(0);
            createdAt = reader.GetFieldValue<DateTimeOffset>(1);
            updatedAt = reader.GetFieldValue<DateTimeOffset>(2);
        }

        if (!string.Equals(currentJobStatus, targetJobStatus, StringComparison.Ordinal))
        {
            await using var jobCmd = new NpgsqlCommand(updateJobSql, conn, tx);
            jobCmd.Parameters.AddWithValue("targetJobStatus", targetJobStatus);
            jobCmd.Parameters.AddWithValue("jobId", jobId);
            await jobCmd.ExecuteNonQueryAsync(ct);
        }

        string eventNote = string.Equals(currentJobStatus, JobStateMachine.Open, StringComparison.Ordinal)
            ? "First offer submitted by professional"
            : "Offer submitted by professional";

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", currentJobStatus);
            eventCmd.Parameters.AddWithValue("toStatus", targetJobStatus);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            eventCmd.Parameters.AddWithValue("note", eventNote);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        string payloadJson = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            offer_id = offerId,
            professional_name = professionalName,
            title = jobTitle,
            price,
        });

        await using (var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx))
        {
            notifCmd.Parameters.AddWithValue("userId", customerId);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

        return new ProfessionalOfferRecord(
            offerId,
            jobId,
            professionalId,
            price,
            inspectionFee,
            etaMinutes,
            message,
            "pending",
            targetJobStatus,
            null,
            customerId,
            jobTitle,
            createdAt,
            updatedAt);
    }

    public async Task<ProfessionalOfferRecord> UpdateProfessionalOfferAsync(
        Guid offerId,
        Guid jobId,
        Guid professionalId,
        string currentJobStatus,
        decimal price,
        decimal inspectionFee,
        int etaMinutes,
        string? message,
        CancellationToken ct = default)
    {
        const string updateSql = @"
            UPDATE public.offers
            SET price = @price,
                inspection_fee = @inspectionFee,
                eta_minutes = @etaMinutes,
                message = @message,
                updated_at = now()
            WHERE id = @offerId
              AND professional_id = @professionalId
            RETURNING created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, @toStatus, @actorId, 'Offer updated by professional', now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        DateTimeOffset createdAt;
        DateTimeOffset updatedAt;

        await using (var cmd = new NpgsqlCommand(updateSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("offerId", offerId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            cmd.Parameters.AddWithValue("price", price);
            cmd.Parameters.AddWithValue("inspectionFee", inspectionFee);
            cmd.Parameters.AddWithValue("etaMinutes", etaMinutes);
            cmd.Parameters.AddWithValue("message", (object?)message ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            createdAt = reader.GetFieldValue<DateTimeOffset>(0);
            updatedAt = reader.GetFieldValue<DateTimeOffset>(1);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", currentJobStatus);
            eventCmd.Parameters.AddWithValue("toStatus", currentJobStatus);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

        return new ProfessionalOfferRecord(
            offerId,
            jobId,
            professionalId,
            price,
            inspectionFee,
            etaMinutes,
            message,
            "pending",
            currentJobStatus,
            null,
            Guid.Empty,
            string.Empty,
            createdAt,
            updatedAt);
    }

    public async Task<ProfessionalOfferRecord> WithdrawProfessionalOfferAsync(
        Guid offerId,
        Guid jobId,
        Guid professionalId,
        string currentJobStatus,
        CancellationToken ct = default)
    {
        const string updateSql = @"
            UPDATE public.offers
            SET status = 'withdrawn',
                updated_at = now()
            WHERE id = @offerId
              AND professional_id = @professionalId
            RETURNING price, COALESCE(inspection_fee, 0), COALESCE(eta_minutes, 0), message, created_at, updated_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, @toStatus, @actorId, 'Offer withdrawn by professional', now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        decimal price;
        decimal fee;
        int eta;
        string? message;
        DateTimeOffset createdAt;
        DateTimeOffset updatedAt;

        await using (var cmd = new NpgsqlCommand(updateSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("offerId", offerId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            price = reader.GetDecimal(0);
            fee = reader.GetDecimal(1);
            eta = reader.GetInt32(2);
            message = reader.IsDBNull(3) ? null : reader.GetString(3);
            createdAt = reader.GetFieldValue<DateTimeOffset>(4);
            updatedAt = reader.GetFieldValue<DateTimeOffset>(5);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", currentJobStatus);
            eventCmd.Parameters.AddWithValue("toStatus", currentJobStatus);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);

        return new ProfessionalOfferRecord(
            offerId,
            jobId,
            professionalId,
            price,
            fee,
            eta,
            message,
            "withdrawn",
            currentJobStatus,
            null,
            Guid.Empty,
            string.Empty,
            createdAt,
            updatedAt);
    }

    public async Task<CustomerJobRecord> StartProfessionalJobAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string jobTitle,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'In progress',
                work_started_at = COALESCE(work_started_at, now()),
                updated_at = now()
            WHERE id = @jobId
              AND assigned_professional_id = @professionalId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at, work_started_at, professional_marked_done_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, 'Assigned', 'In progress', @actorId, 'Professional started work', now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'job_started', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        string payloadJson = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            title = jobTitle,
            status = JobStateMachine.InProgress,
        });

        await using (var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx))
        {
            notifCmd.Parameters.AddWithValue("userId", customerId);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<CustomerJobRecord> MarkProfessionalJobDoneAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string jobTitle,
        string? note,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET professional_marked_done_at = now(),
                updated_at = now()
            WHERE id = @jobId
              AND assigned_professional_id = @professionalId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at, work_started_at, professional_marked_done_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, 'In progress', 'In progress', @actorId, @note, now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'work_marked_done', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        string eventNote = string.IsNullOrWhiteSpace(note)
            ? "Professional marked work as done"
            : note.Trim();

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            eventCmd.Parameters.AddWithValue("note", eventNote);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        string payloadJson = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            title = jobTitle,
            status = JobStateMachine.InProgress,
            professional_marked_done_at = updated.ProfessionalMarkedDoneAt,
        });

        await using (var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx))
        {
            notifCmd.Parameters.AddWithValue("userId", customerId);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    public async Task<CustomerJobRecord> DisputeProfessionalJobAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string fromStatus,
        string jobTitle,
        string reason,
        CancellationToken ct = default)
    {
        const string updateJobSql = @"
            UPDATE public.jobs
            SET status = 'Disputed',
                updated_at = now()
            WHERE id = @jobId
              AND assigned_professional_id = @professionalId
            RETURNING id, customer_id, title, description, category_id, area_id,
                      budget_min, budget_max, urgency, status, assigned_professional_id,
                      expires_at, created_at, updated_at, work_started_at, professional_marked_done_at;";

        const string insertEventSql = @"
            INSERT INTO public.job_events (job_id, from_status, to_status, actor_id, note, at)
            VALUES (@jobId, @fromStatus, 'Disputed', @actorId, @note, now());";

        const string insertNotificationSql = @"
            INSERT INTO public.notifications (user_id, type, payload, created_at)
            VALUES (@userId, 'job_status_changed', @payload::jsonb, now());";

        await using var conn = CreateConnection();
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        CustomerJobRecord updated;
        await using (var cmd = new NpgsqlCommand(updateJobSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("jobId", jobId);
            cmd.Parameters.AddWithValue("professionalId", professionalId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            await reader.ReadAsync(ct);
            updated = ReadCustomerJobRecord(reader);
        }

        await using (var eventCmd = new NpgsqlCommand(insertEventSql, conn, tx))
        {
            eventCmd.Parameters.AddWithValue("jobId", jobId);
            eventCmd.Parameters.AddWithValue("fromStatus", fromStatus);
            eventCmd.Parameters.AddWithValue("actorId", professionalId);
            eventCmd.Parameters.AddWithValue("note", reason);
            await eventCmd.ExecuteNonQueryAsync(ct);
        }

        string payloadJson = JsonSerializer.Serialize(new
        {
            job_id = jobId,
            title = jobTitle,
            status = JobStateMachine.Disputed,
        });

        await using (var notifCmd = new NpgsqlCommand(insertNotificationSql, conn, tx))
        {
            notifCmd.Parameters.AddWithValue("userId", customerId);
            notifCmd.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = payloadJson });
            await notifCmd.ExecuteNonQueryAsync(ct);
        }

        await tx.CommitAsync(ct);
        return updated;
    }

    private static CustomerJobRecord ReadCustomerJobRecord(NpgsqlDataReader reader)
    {
        DateTimeOffset? workStartedAt = null;
        DateTimeOffset? professionalMarkedDoneAt = null;

        if (reader.FieldCount > 14 && !reader.IsDBNull(14))
        {
            workStartedAt = reader.GetFieldValue<DateTimeOffset>(14);
        }
        if (reader.FieldCount > 15 && !reader.IsDBNull(15))
        {
            professionalMarkedDoneAt = reader.GetFieldValue<DateTimeOffset>(15);
        }

        return new CustomerJobRecord(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetInt64(4),
            reader.GetInt64(5),
            reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            reader.IsDBNull(7) ? null : reader.GetDecimal(7),
            reader.GetString(8),
            reader.GetString(9),
            reader.IsDBNull(10) ? null : reader.GetGuid(10),
            reader.IsDBNull(11) ? null : reader.GetFieldValue<DateTimeOffset>(11),
            reader.GetFieldValue<DateTimeOffset>(12),
            reader.GetFieldValue<DateTimeOffset>(13),
            workStartedAt,
            professionalMarkedDoneAt);
    }

    private static ProfessionalOfferRecord ReadProfessionalOfferRecord(NpgsqlDataReader reader)
    {
        return new ProfessionalOfferRecord(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetGuid(2),
            reader.GetDecimal(3),
            reader.GetDecimal(4),
            reader.GetInt32(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetString(7),
            reader.GetString(8),
            reader.IsDBNull(9) ? null : reader.GetFieldValue<DateTimeOffset>(9),
            reader.GetGuid(10),
            reader.GetString(11),
            reader.GetFieldValue<DateTimeOffset>(12),
            reader.GetFieldValue<DateTimeOffset>(13));
    }
}
