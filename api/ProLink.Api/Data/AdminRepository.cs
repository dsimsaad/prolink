using Npgsql;
using NpgsqlTypes;
using ProLink.Api.Models;
using ProLink.Engine.Admin;

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
            SELECT id, role, COALESCE(is_suspended, false)
            FROM public.profiles
            WHERE id = @userId
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
            reader.GetBoolean(2));
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
}
