using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Engine.Admin;
using ProLink.Engine.Rules;

namespace ProLink.Api.Tests;

public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestBearer";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var headerValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        string header = headerValues.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid scheme"));
        }

        string sub = header["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(sub) || !Guid.TryParse(sub, out _))
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid sub token"));
        }

        var claims = new[]
        {
            new Claim("sub", sub),
            new Claim("email", "test@example.invalid"),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

public sealed class FakeAdminRepository : IAdminRepository
{
    public static readonly Guid AdminId = Guid.Parse("55555555-5555-5555-5555-555555555555");
    public static readonly Guid NormalUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid OtherCustomerId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid SuspendedUserId = Guid.Parse("77777777-7777-7777-7777-777777777777");
    public static readonly Guid SuspendedAdminId = Guid.Parse("66666666-6666-6666-6666-666666666666");
    public static readonly Guid Pro1Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid Pro2Id = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public static readonly Guid PendingProId = Guid.Parse("88888888-8888-8888-8888-888888888888");
    public static readonly Guid SuspendedProId = Guid.Parse("99999999-9999-9999-9999-999999999999");

    public static readonly Guid OpenJobId = Guid.Parse("aaaaaaaa-0000-4000-8000-000000000001");
    public static readonly Guid CompletedJobId = Guid.Parse("aaaaaaaa-0000-4000-8000-000000000002");
    public static readonly Guid DisputedJobId = Guid.Parse("aaaaaaaa-0000-4000-8000-000000000003");

    public readonly Dictionary<Guid, string> JobStatuses = new()
    {
        [OpenJobId] = JobStateMachine.Open,
        [CompletedJobId] = JobStateMachine.Completed,
        [DisputedJobId] = JobStateMachine.Disputed,
    };

    public int TransitionCallCount { get; private set; }
    public string? LastTransitionToStatus { get; private set; }
    public string? LastAuditAction { get; private set; }

    public Task<AdminAuthRecord?> GetUserAuthRecordAsync(Guid userId, CancellationToken ct = default)
    {
        if (userId == AdminId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(AdminId, "admin", false));
        }
        if (userId == NormalUserId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(NormalUserId, "user", false));
        }
        if (userId == OtherCustomerId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(OtherCustomerId, "user", false));
        }
        if (userId == SuspendedUserId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(SuspendedUserId, "user", true));
        }
        if (userId == SuspendedAdminId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(SuspendedAdminId, "admin", true));
        }
        if (userId == Pro1Id)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(Pro1Id, "user", false, "approved", "Demo Pro One"));
        }
        if (userId == Pro2Id)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(Pro2Id, "user", false, "approved", "Demo Pro Two"));
        }
        if (userId == PendingProId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(PendingProId, "user", false, "pending", "Pending Applicant"));
        }
        if (userId == SuspendedProId)
        {
            return Task.FromResult<AdminAuthRecord?>(new AdminAuthRecord(SuspendedProId, "user", true, "approved", "Suspended Pro"));
        }
        return Task.FromResult<AdminAuthRecord?>(null);
    }

    public Task<IReadOnlyList<PendingApplicationRecord>> GetPendingApplicationsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<PendingApplicationRecord> items = new[]
        {
            new PendingApplicationRecord(NormalUserId, "Demo Ahmed Khan", 6, DateTimeOffset.UtcNow.AddHours(-10)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<OpenReportRecord>> GetOpenReportsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<OpenReportRecord> items = new[]
        {
            new OpenReportRecord(Guid.NewGuid(), "Unapproved charges", "open", DateTimeOffset.UtcNow.AddHours(-5)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<DisputedJobRecord>> GetDisputedJobsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<DisputedJobRecord> items = new[]
        {
            new DisputedJobRecord(DisputedJobId, "Kitchen pipe leak", "Area 01", DateTimeOffset.UtcNow.AddHours(-2)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<AuditEntry>> GetRecentAuditEntriesAsync(int maxRows = 5000, CancellationToken ct = default)
    {
        IReadOnlyList<AuditEntry> items = new[]
        {
            new AuditEntry("a1", AdminId.ToString(), "Admin One", "category_created", "category", "1", "{}", DateTimeOffset.UtcNow.AddHours(-1)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<UserSearchEntry>> GetAllUsersForSearchAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        IReadOnlyList<UserSearchEntry> items = new[]
        {
            new UserSearchEntry("u-ahmed-old", "Demo Ahmed Khan", now.AddDays(-10)),
            new UserSearchEntry("u-ahmed-new", "Demo Ahmed Raza", now.AddDays(-1)),
            new UserSearchEntry("u-bilal", "Demo Bilal Tariq", now.AddDays(-3)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<JobSearchEntry>> GetAllJobsForSearchAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        IReadOnlyList<JobSearchEntry> items = new[]
        {
            new JobSearchEntry(OpenJobId.ToString(), "Inverter AC repair", "Replace compressor and refill gas", now.AddDays(-1)),
            new JobSearchEntry(DisputedJobId.ToString(), "Kitchen plumbing leak", "Fix sink pipe leak", now.AddDays(-2)),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<GroupJobCountRecord>> GetCategoryJobCountsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<GroupJobCountRecord> items = new[]
        {
            new GroupJobCountRecord(1, "Plumbing", 15),
            new GroupJobCountRecord(2, "Electrical", 22),
            new GroupJobCountRecord(3, "Painting", 9),
            new GroupJobCountRecord(4, "Carpentry", 22),
        };
        return Task.FromResult(items);
    }

    public Task<IReadOnlyList<GroupJobCountRecord>> GetAreaJobCountsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<GroupJobCountRecord> items = new[]
        {
            new GroupJobCountRecord(1, "Area 01", 12),
            new GroupJobCountRecord(2, "Area 02", 18),
            new GroupJobCountRecord(3, "Area 03", 7),
        };
        return Task.FromResult(items);
    }

    public Task<FunnelCountsRecord> GetFunnelCountsAsync(CancellationToken ct = default)
    {
        return Task.FromResult(new FunnelCountsRecord(40, 28, 19, 11));
    }

    public Task<JobStatusRecord?> GetJobStatusAsync(Guid jobId, CancellationToken ct = default)
    {
        if (JobStatuses.TryGetValue(jobId, out string? status))
        {
            return Task.FromResult<JobStatusRecord?>(new JobStatusRecord(jobId, status));
        }
        return Task.FromResult<JobStatusRecord?>(null);
    }

    public Task TransitionJobWithAuditAsync(
        Guid jobId,
        string fromStatus,
        string toStatus,
        Guid adminId,
        string note,
        string auditAction,
        string auditDetailsJson,
        CancellationToken ct = default)
    {
        TransitionCallCount++;
        LastTransitionToStatus = toStatus;
        LastAuditAction = auditAction;
        JobStatuses[jobId] = toStatus;
        return Task.CompletedTask;
    }

    public readonly Dictionary<Guid, CustomerJobRecord> CustomerJobs = new();
    public readonly Dictionary<Guid, List<JobOfferRecord>> JobOffers = new();
    public readonly Dictionary<Guid, Guid> JobConversations = new();
    public readonly HashSet<Guid> ReviewedJobs = new();
    public readonly List<(Guid UserId, string Type, string Title)> Notifications = new();

    public Task<bool> IsActiveCategoryAsync(long categoryId, CancellationToken ct = default) =>
        Task.FromResult(categoryId is 1 or 2 or 3);

    public Task<bool> AreaExistsAsync(long areaId, CancellationToken ct = default) =>
        Task.FromResult(areaId is 1 or 2);

    public Task<IReadOnlyList<ActiveCategoryRecord>> GetActiveCategoriesAsync(CancellationToken ct = default)
    {
        IReadOnlyList<ActiveCategoryRecord> cats = new[]
        {
            new ActiveCategoryRecord(1, "Plumbing"),
            new ActiveCategoryRecord(2, "Electrical"),
            new ActiveCategoryRecord(3, "AC & Cooling"),
        };
        return Task.FromResult(cats);
    }

    public Task<CustomerJobRecord?> GetCustomerJobAsync(Guid jobId, Guid customerId, CancellationToken ct = default)
    {
        if (CustomerJobs.TryGetValue(jobId, out var job) && job.CustomerId == customerId)
        {
            return Task.FromResult<CustomerJobRecord?>(job);
        }
        return Task.FromResult<CustomerJobRecord?>(null);
    }

    public Task<CustomerJobRecord> CreateCustomerJobAsync(
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
        var now = DateTimeOffset.UtcNow;
        var job = new CustomerJobRecord(
            Guid.NewGuid(),
            customerId,
            title,
            description,
            categoryId,
            areaId,
            budgetMin,
            budgetMax,
            urgency,
            publish ? JobStateMachine.Open : JobStateMachine.Draft,
            null,
            expiresAt,
            now,
            now);

        CustomerJobs[job.Id] = job;
        JobStatuses[job.Id] = job.Status;
        return Task.FromResult(job);
    }

    public Task<CustomerJobRecord> UpdateDraftJobAsync(
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
        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Title = title,
            Description = description,
            CategoryId = categoryId,
            AreaId = areaId,
            BudgetMin = budgetMin,
            BudgetMax = budgetMax,
            Urgency = urgency,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        CustomerJobs[jobId] = updated;
        return Task.FromResult(updated);
    }

    public Task<CustomerJobRecord> PublishCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        DateTimeOffset expiresAt,
        CancellationToken ct = default)
    {
        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.Open,
            ExpiresAt = expiresAt,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        return Task.FromResult(updated);
    }

    public Task<CustomerJobRecord> CancelCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string? reason,
        CancellationToken ct = default)
    {
        if (JobOffers.TryGetValue(jobId, out var offers))
        {
            for (int i = 0; i < offers.Count; i++)
            {
                if (offers[i].Status == "pending")
                {
                    offers[i] = offers[i] with { Status = "rejected" };
                }
            }
        }

        if (assignedProfessionalId.HasValue)
        {
            Notifications.Add((assignedProfessionalId.Value, "job_status_changed", jobTitle));
        }

        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.Cancelled,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        return Task.FromResult(updated);
    }

    public Task<JobOfferRecord?> GetJobOfferAsync(Guid jobId, Guid offerId, CancellationToken ct = default)
    {
        if (JobOffers.TryGetValue(jobId, out var offers))
        {
            var match = offers.FirstOrDefault(o => o.Id == offerId);
            return Task.FromResult(match);
        }
        return Task.FromResult<JobOfferRecord?>(null);
    }

    public Task<AcceptOfferResult> AcceptOfferAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        string jobTitle,
        Guid offerId,
        Guid professionalId,
        CancellationToken ct = default)
    {
        var rejectedPros = new List<Guid>();
        if (JobOffers.TryGetValue(jobId, out var offers))
        {
            for (int i = 0; i < offers.Count; i++)
            {
                if (offers[i].Id == offerId)
                {
                    offers[i] = offers[i] with { Status = "accepted" };
                }
                else if (offers[i].Status == "pending")
                {
                    offers[i] = offers[i] with { Status = "rejected" };
                    rejectedPros.Add(offers[i].ProfessionalId);
                }
            }
        }

        if (!JobConversations.TryGetValue(jobId, out Guid convId))
        {
            convId = Guid.NewGuid();
            JobConversations[jobId] = convId;
        }

        Notifications.Add((professionalId, "offer_accepted", jobTitle));
        foreach (var rejId in rejectedPros)
        {
            Notifications.Add((rejId, "job_status_changed", jobTitle));
        }

        var existing = CustomerJobs[jobId];
        var now = DateTimeOffset.UtcNow;
        var updated = existing with
        {
            Status = JobStateMachine.Assigned,
            AssignedProfessionalId = professionalId,
            UpdatedAt = now,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;

        return Task.FromResult(new AcceptOfferResult(
            jobId,
            fromStatus,
            JobStateMachine.Assigned,
            offerId,
            professionalId,
            convId,
            rejectedPros,
            now));
    }

    public Task<CustomerJobRecord> CompleteCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        Guid? assignedProfessionalId,
        string jobTitle,
        CancellationToken ct = default)
    {
        if (assignedProfessionalId.HasValue)
        {
            Notifications.Add((assignedProfessionalId.Value, "job_status_changed", jobTitle));
        }

        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.Completed,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        return Task.FromResult(updated);
    }

    public Task<CustomerJobRecord> DisputeCustomerJobAsync(
        Guid jobId,
        Guid customerId,
        string fromStatus,
        Guid? assignedProfessionalId,
        string jobTitle,
        string reason,
        CancellationToken ct = default)
    {
        if (assignedProfessionalId.HasValue)
        {
            Notifications.Add((assignedProfessionalId.Value, "job_status_changed", jobTitle));
        }

        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.Disputed,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        return Task.FromResult(updated);
    }

    public Task<bool> HasReviewForJobAsync(Guid jobId, CancellationToken ct = default) =>
        Task.FromResult(ReviewedJobs.Contains(jobId));

    public Task<ReviewRecord> CreateReviewAsync(
        Guid jobId,
        Guid reviewerId,
        Guid professionalId,
        int rating,
        string? comment,
        CancellationToken ct = default)
    {
        ReviewedJobs.Add(jobId);
        return Task.FromResult(new ReviewRecord(
            Guid.NewGuid(),
            jobId,
            reviewerId,
            professionalId,
            rating,
            comment,
            DateTimeOffset.UtcNow));
    }

    public Task<IReadOnlyList<Guid>> FindMatchingProfessionalsAsync(
        long categoryId,
        long areaId,
        Guid excludeCustomerId,
        int limit,
        CancellationToken ct = default)
    {
        IReadOnlyList<Guid> pros = new[] { Pro1Id, Pro2Id }
            .Where(id => id != excludeCustomerId)
            .Take(limit)
            .ToArray();
        return Task.FromResult(pros);
    }

    public Task InsertJobMatchNotificationsAsync(
        Guid jobId,
        string jobTitle,
        string urgency,
        IReadOnlyList<Guid> professionalIds,
        CancellationToken ct = default)
    {
        foreach (var proId in professionalIds)
        {
            Notifications.Add((proId, "new_job_match", jobTitle));
        }
        return Task.CompletedTask;
    }

    public readonly Dictionary<Guid, HashSet<long>> ProfessionalSkills = new()
    {
        [Pro1Id] = new HashSet<long> { 1, 2 },
        [Pro2Id] = new HashSet<long> { 1, 3 },
    };

    public readonly Dictionary<Guid, ProfessionalOfferRecord> ProOffers = new();

    public Task<CustomerJobRecord?> GetJobByIdAsync(Guid jobId, CancellationToken ct = default)
    {
        CustomerJobs.TryGetValue(jobId, out var job);
        return Task.FromResult(job);
    }

    public Task<CustomerJobRecord?> GetAssignedProfessionalJobAsync(Guid jobId, Guid professionalId, CancellationToken ct = default)
    {
        if (CustomerJobs.TryGetValue(jobId, out var job) && job.AssignedProfessionalId == professionalId)
        {
            return Task.FromResult<CustomerJobRecord?>(job);
        }
        return Task.FromResult<CustomerJobRecord?>(null);
    }

    public Task<bool> ProfessionalHasCategorySkillAsync(Guid professionalId, long categoryId, CancellationToken ct = default)
    {
        bool hasSkill = ProfessionalSkills.TryGetValue(professionalId, out var skills) && skills.Contains(categoryId);
        return Task.FromResult(hasSkill);
    }

    public Task<ProfessionalOfferRecord?> GetProfessionalOfferForJobAsync(Guid jobId, Guid professionalId, CancellationToken ct = default)
    {
        var match = ProOffers.Values.FirstOrDefault(o => o.JobId == jobId && o.ProfessionalId == professionalId);
        if (match is not null && CustomerJobs.TryGetValue(jobId, out var job))
        {
            match = match with { JobStatus = job.Status, JobExpiresAt = job.ExpiresAt };
        }
        return Task.FromResult(match);
    }

    public Task<ProfessionalOfferRecord?> GetProfessionalOfferByIdAsync(Guid offerId, Guid professionalId, CancellationToken ct = default)
    {
        if (ProOffers.TryGetValue(offerId, out var offer) && offer.ProfessionalId == professionalId)
        {
            if (CustomerJobs.TryGetValue(offer.JobId, out var job))
            {
                offer = offer with { JobStatus = job.Status, JobExpiresAt = job.ExpiresAt };
            }
            return Task.FromResult<ProfessionalOfferRecord?>(offer);
        }
        return Task.FromResult<ProfessionalOfferRecord?>(null);
    }

    public Task<ProfessionalOfferRecord> CreateProfessionalOfferAsync(
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
        var now = DateTimeOffset.UtcNow;
        var offer = new ProfessionalOfferRecord(
            Guid.NewGuid(),
            jobId,
            professionalId,
            price,
            inspectionFee,
            etaMinutes,
            message,
            "pending",
            targetJobStatus,
            CustomerJobs.TryGetValue(jobId, out var j) ? j.ExpiresAt : null,
            customerId,
            jobTitle,
            now,
            now);

        ProOffers[offer.Id] = offer;

        if (!JobOffers.TryGetValue(jobId, out var list))
        {
            list = new List<JobOfferRecord>();
            JobOffers[jobId] = list;
        }
        list.Add(new JobOfferRecord(offer.Id, jobId, professionalId, "pending", price, inspectionFee, etaMinutes));

        if (CustomerJobs.TryGetValue(jobId, out var existingJob))
        {
            CustomerJobs[jobId] = existingJob with { Status = targetJobStatus, UpdatedAt = now };
            JobStatuses[jobId] = targetJobStatus;
        }

        Notifications.Add((customerId, "offer_received", jobTitle));
        return Task.FromResult(offer);
    }

    public Task<ProfessionalOfferRecord> UpdateProfessionalOfferAsync(
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
        var now = DateTimeOffset.UtcNow;
        var existing = ProOffers[offerId];
        var updated = existing with
        {
            Price = price,
            InspectionFee = inspectionFee,
            EtaMinutes = etaMinutes,
            Message = message,
            JobStatus = currentJobStatus,
            UpdatedAt = now,
        };
        ProOffers[offerId] = updated;

        if (JobOffers.TryGetValue(jobId, out var list))
        {
            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].Id == offerId)
                {
                    list[i] = list[i] with { Price = price, InspectionFee = inspectionFee, EtaMinutes = etaMinutes };
                }
            }
        }

        return Task.FromResult(updated);
    }

    public Task<ProfessionalOfferRecord> WithdrawProfessionalOfferAsync(
        Guid offerId,
        Guid jobId,
        Guid professionalId,
        string currentJobStatus,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = ProOffers[offerId];
        var withdrawn = existing with
        {
            Status = "withdrawn",
            JobStatus = currentJobStatus,
            UpdatedAt = now,
        };
        ProOffers[offerId] = withdrawn;

        if (JobOffers.TryGetValue(jobId, out var list))
        {
            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].Id == offerId)
                {
                    list[i] = list[i] with { Status = "withdrawn" };
                }
            }
        }

        return Task.FromResult(withdrawn);
    }

    public Task<CustomerJobRecord> StartProfessionalJobAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string jobTitle,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.InProgress,
            WorkStartedAt = existing.WorkStartedAt ?? now,
            UpdatedAt = now,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        Notifications.Add((customerId, "job_started", jobTitle));
        return Task.FromResult(updated);
    }

    public Task<CustomerJobRecord> MarkProfessionalJobDoneAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string jobTitle,
        string? note,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            ProfessionalMarkedDoneAt = now,
            UpdatedAt = now,
        };
        CustomerJobs[jobId] = updated;
        Notifications.Add((customerId, "work_marked_done", jobTitle));
        return Task.FromResult(updated);
    }

    public Task<CustomerJobRecord> DisputeProfessionalJobAsync(
        Guid jobId,
        Guid professionalId,
        Guid customerId,
        string fromStatus,
        string jobTitle,
        string reason,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = CustomerJobs[jobId];
        var updated = existing with
        {
            Status = JobStateMachine.Disputed,
            UpdatedAt = now,
        };
        CustomerJobs[jobId] = updated;
        JobStatuses[jobId] = updated.Status;
        Notifications.Add((customerId, "job_status_changed", jobTitle));
        return Task.FromResult(updated);
    }
}

public sealed class AdminApiIntegrationTests
{
    private static WebApplicationFactory<Program> CreateFactory(FakeAdminRepository repo, int permitLimit = 60)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:PermitLimit"] = permitLimit.ToString(),
                    ["RateLimiting:WindowSeconds"] = "60",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IAdminRepository>();
                services.AddSingleton<IAdminRepository>(repo);

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            });
        });
    }

    [Fact]
    public async Task Auth_Returns401WithoutToken_403ForNonAdminOrSuspended_And200ForAdmin()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();

        // 1. No token -> 401
        var unauthResponse = await client.GetAsync("/admin/ping");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResponse.StatusCode);

        // 2. Non-admin token -> 403
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());
        var forbiddenResponse = await client.GetAsync("/admin/ping");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);

        // 3. Suspended admin token -> 403
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.SuspendedAdminId.ToString());
        var suspendedResponse = await client.GetAsync("/admin/ping");
        Assert.Equal(HttpStatusCode.Forbidden, suspendedResponse.StatusCode);

        // 4. Valid active admin token -> 200
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.AdminId.ToString());
        var okResponse = await client.GetAsync("/admin/ping");
        Assert.Equal(HttpStatusCode.OK, okResponse.StatusCode);
    }

    [Fact]
    public async Task RateLimiter_Returns429WithRetryAfterHeaderWhenWindowFull()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo, permitLimit: 3);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.AdminId.ToString());

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/admin/ping")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/admin/ping")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/admin/ping")).StatusCode);

        var throttled = await client.GetAsync("/admin/ping");
        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.True(throttled.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task ForceCancel_And_DisputeResolve_ValidateStateAndCallTransactionOnce()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.AdminId.ToString());

        // Unknown job -> 404
        var unknownId = Guid.NewGuid();
        var notFoundResp = await client.PostAsJsonAsync($"/admin/jobs/{unknownId}/force-cancel", new { reason = "Valid cancellation reason" });
        Assert.Equal(HttpStatusCode.NotFound, notFoundResp.StatusCode);

        // Force-cancel a Completed job -> 409 Conflict
        var invalidCancelResp = await client.PostAsJsonAsync($"/admin/jobs/{FakeAdminRepository.CompletedJobId}/force-cancel", new { reason = "Valid cancellation reason" });
        Assert.Equal(HttpStatusCode.Conflict, invalidCancelResp.StatusCode);
        Assert.Equal(0, repo.TransitionCallCount);

        // Force-cancel an Open job -> 200 OK and calls transaction once
        var validCancelResp = await client.PostAsJsonAsync($"/admin/jobs/{FakeAdminRepository.OpenJobId}/force-cancel", new { reason = "Customer requested emergency cancellation." });
        Assert.Equal(HttpStatusCode.OK, validCancelResp.StatusCode);
        Assert.Equal(1, repo.TransitionCallCount);
        Assert.Equal(JobStateMachine.Cancelled, repo.LastTransitionToStatus);
        Assert.Equal("job_force_cancelled", repo.LastAuditAction);

        // Resolve dispute on non-disputed job -> 409 Conflict
        var invalidDisputeResp = await client.PostAsJsonAsync($"/admin/disputes/{FakeAdminRepository.CompletedJobId}/resolve", new { outcome = "completed", note = "Valid resolution note text." });
        Assert.Equal(HttpStatusCode.Conflict, invalidDisputeResp.StatusCode);
        Assert.Equal(1, repo.TransitionCallCount);

        // Resolve dispute on Disputed job -> 200 OK and calls transaction once more
        var validDisputeResp = await client.PostAsJsonAsync($"/admin/disputes/{FakeAdminRepository.DisputedJobId}/resolve", new { outcome = "completed", note = "Verified work completion photos." });
        Assert.Equal(HttpStatusCode.OK, validDisputeResp.StatusCode);
        Assert.Equal(2, repo.TransitionCallCount);
        Assert.Equal(JobStateMachine.Completed, repo.LastTransitionToStatus);
        Assert.Equal("dispute_resolved_completed", repo.LastAuditAction);
    }

    [Fact]
    public async Task Analytics_UserSearch_Suggestions_And_EngineReload_ReturnExpectedOrder()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.AdminId.ToString());

        // Top categories: Electrical (22) and Carpentry (22) tied on count -> Carpentry before Electrical alphabetically
        var topCatResp = await client.GetAsync("/admin/analytics/top-categories?n=3");
        Assert.Equal(HttpStatusCode.OK, topCatResp.StatusCode);
        using var topCatDoc = JsonDocument.Parse(await topCatResp.Content.ReadAsStringAsync());
        var catNames = topCatDoc.RootElement.GetProperty("items").EnumerateArray()
            .Select(e => e.GetProperty("name").GetString())
            .ToArray();
        Assert.Equal(new[] { "Carpentry", "Electrical", "Plumbing" }, catNames);

        // User suggestions via Trie
        var suggestResp = await client.GetAsync("/admin/users/suggest?q=demo%20ah&limit=5");
        Assert.Equal(HttpStatusCode.OK, suggestResp.StatusCode);
        using var suggestDoc = JsonDocument.Parse(await suggestResp.Content.ReadAsStringAsync());
        var suggestedIds = suggestDoc.RootElement.GetProperty("items").EnumerateArray()
            .Select(e => e.GetProperty("id").GetString())
            .ToArray();
        Assert.Equal(2, suggestedIds.Length);
        Assert.Contains("u-ahmed-old", suggestedIds);
        Assert.Contains("u-ahmed-new", suggestedIds);

        // User search via InvertedIndex + MergeSort (u-ahmed-new is more recent than u-ahmed-old)
        var searchResp = await client.GetAsync("/admin/users/search?q=Demo%20Ahmed");
        Assert.Equal(HttpStatusCode.OK, searchResp.StatusCode);
        using var searchDoc = JsonDocument.Parse(await searchResp.Content.ReadAsStringAsync());
        var searchedIds = searchDoc.RootElement.GetProperty("items").EnumerateArray()
            .Select(e => e.GetProperty("id").GetString())
            .ToArray();
        Assert.Equal(new[] { "u-ahmed-new", "u-ahmed-old", "u-bilal" }, searchedIds);

        // Engine reload bumps version
        var reloadResp = await client.PostAsync("/admin/engine/reload", null);
        Assert.Equal(HttpStatusCode.OK, reloadResp.StatusCode);
        using var reloadDoc = JsonDocument.Parse(await reloadResp.Content.ReadAsStringAsync());
        Assert.True(reloadDoc.RootElement.GetProperty("version").GetInt64() >= 2);
    }

    [Fact]
    public void PostgresUriParser_ParsesSessionPoolerUriAndRequiresSsl()
    {
        var uriBuilder = new UriBuilder("postgres", "db.example.invalid", 6543, "appdb")
        {
            UserName = "dbuser.ref",
        };
        string connString = PostgresUriParser.ParseConnectionString(uriBuilder.Uri.ToString());

        Assert.Contains("Host=db.example.invalid", connString);
        Assert.Contains("Port=6543", connString);
        Assert.Contains("Username=dbuser.ref", connString);
        Assert.Contains("Ssl Mode=Require", connString, StringComparison.OrdinalIgnoreCase);
    }
}
