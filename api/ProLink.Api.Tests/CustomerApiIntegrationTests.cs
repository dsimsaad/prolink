using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProLink.Api.Data;
using ProLink.Api.Models;
using ProLink.Engine.Rules;

namespace ProLink.Api.Tests;

public sealed class CustomerApiIntegrationTests
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
    public async Task CustomerAuth_Returns401WithoutToken_And_403WhenSuspended()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();

        // 1. Without token -> 401
        var unauthResp = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Fix kitchen pipe leak",
            description = "Water is leaking from the P-trap under the kitchen sink.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // 2. Suspended customer -> 403
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.SuspendedUserId.ToString());
        var suspendedResp = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Fix kitchen pipe leak",
            description = "Water is leaking from the P-trap under the kitchen sink.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.Forbidden, suspendedResp.StatusCode);
    }

    [Fact]
    public async Task Validation_RejectsInvalidJobInputs()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());

        // Short title
        var shortTitle = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Fix",
            description = "Detailed description with more than twenty characters.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, shortTitle.StatusCode);

        // Short description
        var shortDesc = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Valid job title",
            description = "Too short",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, shortDesc.StatusCode);

        // Negative budget or min > max
        var badBudget = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Valid job title",
            description = "Detailed description with more than twenty characters.",
            categoryId = 1,
            areaId = 1,
            budgetMin = 5000,
            budgetMax = 2000,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badBudget.StatusCode);

        // Invalid urgency
        var badUrgency = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Valid job title",
            description = "Detailed description with more than twenty characters.",
            categoryId = 1,
            areaId = 1,
            urgency = "flexible",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badUrgency.StatusCode);

        // Inactive/unknown category or area
        var badCat = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Valid job title",
            description = "Detailed description with more than twenty characters.",
            categoryId = 999,
            areaId = 1,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badCat.StatusCode);
    }

    [Fact]
    public async Task CreateDraft_EditDraft_Publish_And_OwnershipReturns404ForOtherCustomer()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());

        // 1. Create as Draft
        var createDraftResp = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Replace bathroom tap",
            description = "Need a plumber to replace the leaking basin mixer tap.",
            categoryId = 1,
            areaId = 1,
            budgetMin = 1500,
            budgetMax = 3000,
            urgency = "normal",
            publish = false,
        });
        Assert.Equal(HttpStatusCode.Created, createDraftResp.StatusCode);
        using var draftDoc = JsonDocument.Parse(await createDraftResp.Content.ReadAsStringAsync());
        Guid draftId = draftDoc.RootElement.GetProperty("id").GetGuid();
        Assert.Equal(JobStateMachine.Draft, draftDoc.RootElement.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, draftDoc.RootElement.GetProperty("expiresAt").ValueKind);
        Assert.Empty(repo.Notifications);

        // 2. Edit Draft succeeds
        var patchResp = await client.PatchAsJsonAsync($"/jobs/{draftId}", new
        {
            title = "Replace bathroom mixer tap and valve",
            description = "Need a plumber to replace both the basin mixer tap and angle valve.",
            categoryId = 1,
            areaId = 1,
            budgetMin = 2000,
            budgetMax = 3500,
            urgency = "urgent",
        });
        Assert.Equal(HttpStatusCode.OK, patchResp.StatusCode);

        // 3. Another customer attempting to edit, publish, or cancel gets 404 (never 403)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.OtherCustomerId.ToString());
        var otherPatchResp = await client.PatchAsJsonAsync($"/jobs/{draftId}", new
        {
            title = "Unauthorized edit",
            description = "Attempting to edit someone else's draft job.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
        });
        Assert.Equal(HttpStatusCode.NotFound, otherPatchResp.StatusCode);

        var otherPublishResp = await client.PostAsync($"/jobs/{draftId}/publish", null);
        Assert.Equal(HttpStatusCode.NotFound, otherPublishResp.StatusCode);

        // 4. Owner publishes the Draft -> status Open, sets expiresAt, notifies matched professionals
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());
        var publishResp = await client.PostAsync($"/jobs/{draftId}/publish", null);
        Assert.Equal(HttpStatusCode.OK, publishResp.StatusCode);
        using var publishDoc = JsonDocument.Parse(await publishResp.Content.ReadAsStringAsync());
        Assert.Equal(JobStateMachine.Open, publishDoc.RootElement.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, publishDoc.RootElement.GetProperty("expiresAt").ValueKind);
        Assert.Equal(2, repo.Notifications.Count(n => n.Type == "new_job_match"));

        // 5. Editing or publishing an already Open job returns 409 Conflict
        var editOpenResp = await client.PatchAsJsonAsync($"/jobs/{draftId}", new
        {
            title = "Edit after publish",
            description = "Should fail with 409 Conflict because job is already Open.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
        });
        Assert.Equal(HttpStatusCode.Conflict, editOpenResp.StatusCode);

        var republishResp = await client.PostAsync($"/jobs/{draftId}/publish", null);
        Assert.Equal(HttpStatusCode.Conflict, republishResp.StatusCode);
    }

    [Fact]
    public async Task CreateOpen_AcceptOffer_Complete_And_ReviewOnce()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());

        // 1. Create directly as Open
        var createOpenResp = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Split AC gas refill and wash",
            description = "1.5 ton split AC needs pressure check and full indoor/outdoor service.",
            categoryId = 3,
            areaId = 1,
            budgetMin = 2500,
            budgetMax = 4500,
            urgency = "urgent",
            publish = true,
        });
        Assert.Equal(HttpStatusCode.Created, createOpenResp.StatusCode);
        using var openDoc = JsonDocument.Parse(await createOpenResp.Content.ReadAsStringAsync());
        Guid jobId = openDoc.RootElement.GetProperty("id").GetGuid();
        Assert.Equal(JobStateMachine.Open, openDoc.RootElement.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, openDoc.RootElement.GetProperty("expiresAt").ValueKind);

        // Seed 2 pending offers from Pro1 and Pro2
        Guid offer1Id = Guid.NewGuid();
        Guid offer2Id = Guid.NewGuid();
        repo.JobOffers[jobId] = new List<JobOfferRecord>
        {
            new(offer1Id, jobId, FakeAdminRepository.Pro1Id, "pending", 3000m, 200m, 30),
            new(offer2Id, jobId, FakeAdminRepository.Pro2Id, "pending", 3500m, 300m, 45),
        };

        // 2. Accept offer 1 -> marks offer 1 accepted, rejects offer 2, sets job to Assigned, creates conversation once
        var acceptResp = await client.PostAsync($"/jobs/{jobId}/offers/{offer1Id}/accept", null);
        Assert.Equal(HttpStatusCode.OK, acceptResp.StatusCode);
        using var acceptDoc = JsonDocument.Parse(await acceptResp.Content.ReadAsStringAsync());
        Assert.Equal(JobStateMachine.Assigned, acceptDoc.RootElement.GetProperty("status").GetString());
        Assert.Equal(FakeAdminRepository.Pro1Id, acceptDoc.RootElement.GetProperty("assignedProfessionalId").GetGuid());
        Guid convId = acceptDoc.RootElement.GetProperty("conversationId").GetGuid();
        Assert.NotEqual(Guid.Empty, convId);
        Assert.Single(repo.JobConversations);

        Assert.Equal("accepted", repo.JobOffers[jobId].Single(o => o.Id == offer1Id).Status);
        Assert.Equal("rejected", repo.JobOffers[jobId].Single(o => o.Id == offer2Id).Status);
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.Pro1Id && n.Type == "offer_accepted");
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.Pro2Id && n.Type == "job_status_changed");

        // Accepting again while Assigned returns 409 Conflict
        var secondAcceptResp = await client.PostAsync($"/jobs/{jobId}/offers/{offer2Id}/accept", null);
        Assert.Equal(HttpStatusCode.Conflict, secondAcceptResp.StatusCode);

        // 3. Complete before In progress returns 409 Conflict
        var prematureCompleteResp = await client.PostAsync($"/jobs/{jobId}/complete", null);
        Assert.Equal(HttpStatusCode.Conflict, prematureCompleteResp.StatusCode);

        // Review before Completed returns 409 Conflict
        var prematureReviewResp = await client.PostAsJsonAsync($"/jobs/{jobId}/review", new { rating = 5, comment = "Great work" });
        Assert.Equal(HttpStatusCode.Conflict, prematureReviewResp.StatusCode);

        // Move job to In progress (simulating professional starting work)
        repo.CustomerJobs[jobId] = repo.CustomerJobs[jobId] with { Status = JobStateMachine.InProgress };
        repo.JobStatuses[jobId] = JobStateMachine.InProgress;

        // 4. Customer cannot cancel once In progress (returns 409 Conflict)
        var cancelInProgressResp = await client.PostAsJsonAsync($"/jobs/{jobId}/cancel", new { reason = "Too late to cancel" });
        Assert.Equal(HttpStatusCode.Conflict, cancelInProgressResp.StatusCode);

        // 5. Complete from In progress succeeds
        var completeResp = await client.PostAsync($"/jobs/{jobId}/complete", null);
        Assert.Equal(HttpStatusCode.OK, completeResp.StatusCode);
        Assert.Equal(JobStateMachine.Completed, repo.CustomerJobs[jobId].Status);

        // 6. Submit review once -> 201 Created; second review -> 409 Conflict
        var reviewResp = await client.PostAsJsonAsync($"/jobs/{jobId}/review", new
        {
            rating = 5,
            comment = "Punctual and clean AC service.",
        });
        Assert.Equal(HttpStatusCode.Created, reviewResp.StatusCode);

        var duplicateReviewResp = await client.PostAsJsonAsync($"/jobs/{jobId}/review", new
        {
            rating = 4,
            comment = "Second review attempt.",
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicateReviewResp.StatusCode);
    }

    [Fact]
    public async Task Cancel_And_Dispute_EnforceStateRulesAndReasonValidation()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());

        // Create an Open job and assign it
        var createResp = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Electrical breaker replacement",
            description = "Main distribution board breaker keeps tripping under load.",
            categoryId = 2,
            areaId = 1,
            urgency = "normal",
            publish = true,
        });
        using var doc = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync());
        Guid jobId = doc.RootElement.GetProperty("id").GetGuid();

        // Dispute on Open job -> 409 Conflict
        var disputeOpenResp = await client.PostAsJsonAsync($"/jobs/{jobId}/dispute", new
        {
            reason = "Valid dispute reason over ten characters.",
        });
        Assert.Equal(HttpStatusCode.Conflict, disputeOpenResp.StatusCode);

        // Move to Assigned
        repo.CustomerJobs[jobId] = repo.CustomerJobs[jobId] with
        {
            Status = JobStateMachine.Assigned,
            AssignedProfessionalId = FakeAdminRepository.Pro1Id,
        };
        repo.JobStatuses[jobId] = JobStateMachine.Assigned;

        // Dispute with short reason -> 400 Bad Request
        var shortDisputeResp = await client.PostAsJsonAsync($"/jobs/{jobId}/dispute", new { reason = "Too short" });
        Assert.Equal(HttpStatusCode.BadRequest, shortDisputeResp.StatusCode);

        // Valid dispute on Assigned job -> 200 OK, status becomes Disputed
        var validDisputeResp = await client.PostAsJsonAsync($"/jobs/{jobId}/dispute", new
        {
            reason = "Professional installed the wrong amperage breaker and left wires exposed.",
        });
        Assert.Equal(HttpStatusCode.OK, validDisputeResp.StatusCode);
        Assert.Equal(JobStateMachine.Disputed, repo.CustomerJobs[jobId].Status);

        // Cancel on Assigned job (create a second job to test customer cancel from Assigned)
        var createResp2 = await client.PostAsJsonAsync("/jobs", new
        {
            title = "Plumbing pipe fix",
            description = "Replace corroded galvanized pipe under the washbasin.",
            categoryId = 1,
            areaId = 1,
            urgency = "normal",
            publish = true,
        });
        using var doc2 = JsonDocument.Parse(await createResp2.Content.ReadAsStringAsync());
        Guid job2Id = doc2.RootElement.GetProperty("id").GetGuid();
        repo.CustomerJobs[job2Id] = repo.CustomerJobs[job2Id] with
        {
            Status = JobStateMachine.Assigned,
            AssignedProfessionalId = FakeAdminRepository.Pro2Id,
        };

        var cancelAssignedResp = await client.PostAsJsonAsync($"/jobs/{job2Id}/cancel", new { reason = "Issue resolved." });
        Assert.Equal(HttpStatusCode.OK, cancelAssignedResp.StatusCode);
        Assert.Equal(JobStateMachine.Cancelled, repo.CustomerJobs[job2Id].Status);
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.Pro2Id && n.Type == "job_status_changed");
    }

    [Fact]
    public async Task CustomerRateLimiter_Returns429WhenWindowExceeded()
    {
        var repo = new FakeAdminRepository();
        await using var factory = CreateFactory(repo, permitLimit: 2);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/jobs/suggest-category?text=leaking%20sink%20pipe")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/jobs/suggest-category?text=leaking%20sink%20pipe")).StatusCode);

        var throttled = await client.GetAsync("/jobs/suggest-category?text=leaking%20sink%20pipe");
        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
    }
}
