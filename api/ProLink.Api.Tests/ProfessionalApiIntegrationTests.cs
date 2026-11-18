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

public sealed class ProfessionalApiIntegrationTests
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

    private static CustomerJobRecord SeedOpenCustomerJob(
        FakeAdminRepository repo,
        Guid customerId,
        long categoryId = 1,
        string status = JobStateMachine.Open)
    {
        var now = DateTimeOffset.UtcNow;
        var job = new CustomerJobRecord(
            Guid.NewGuid(),
            customerId,
            "Kitchen sink pipe repair",
            "Water is leaking from the pipe joint under the sink.",
            categoryId,
            1,
            1500m,
            3500m,
            "normal",
            status,
            null,
            now.AddDays(7),
            now,
            now);

        repo.CustomerJobs[job.Id] = job;
        repo.JobStatuses[job.Id] = job.Status;
        return job;
    }

    [Fact]
    public async Task ProAuth_Returns401WithoutToken_And_403NotApprovedForPlainPendingOrSuspendedUsers()
    {
        var repo = new FakeAdminRepository();
        var job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId);
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();

        // 1. Without token -> 401
        var unauthResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2500,
            inspectionFee = 200,
            etaMinutes = 30,
            message = "Can arrive in 30 minutes.",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, unauthResp.StatusCode);

        // 2. Plain user (no professional profile) -> 403 not_approved
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());
        var plainResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2500,
            inspectionFee = 200,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Forbidden, plainResp.StatusCode);
        using var plainDoc = JsonDocument.Parse(await plainResp.Content.ReadAsStringAsync());
        Assert.Equal("not_approved", plainDoc.RootElement.GetProperty("code").GetString());

        // 3. Pending professional -> 403 not_approved
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.PendingProId.ToString());
        var pendingResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2500,
            inspectionFee = 200,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Forbidden, pendingResp.StatusCode);
        using var pendingDoc = JsonDocument.Parse(await pendingResp.Content.ReadAsStringAsync());
        Assert.Equal("not_approved", pendingDoc.RootElement.GetProperty("code").GetString());

        // 4. Suspended professional -> 403 not_approved
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.SuspendedProId.ToString());
        var suspendedResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2500,
            inspectionFee = 200,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Forbidden, suspendedResp.StatusCode);
        using var suspendedDoc = JsonDocument.Parse(await suspendedResp.Content.ReadAsStringAsync());
        Assert.Equal("not_approved", suspendedDoc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task SubmitOffer_ValidatesFields_RejectsOwnJobCategoryMismatchAndDuplicate_AndTransitionsFirstOffer()
    {
        var repo = new FakeAdminRepository();
        var job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId, categoryId: 1);
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());

        // 1. Validation errors (price <= 0, fee > 100k, eta < 10, message > 500)
        var badPrice = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 0,
            inspectionFee = 0,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badPrice.StatusCode);

        var highPrice = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 10_000_001,
            inspectionFee = 0,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.BadRequest, highPrice.StatusCode);

        var badFee = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2000,
            inspectionFee = 150_000,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badFee.StatusCode);

        var badEta = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2000,
            inspectionFee = 0,
            etaMinutes = 5,
        });
        Assert.Equal(HttpStatusCode.BadRequest, badEta.StatusCode);

        var longMsg = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2000,
            inspectionFee = 0,
            etaMinutes = 30,
            message = new string('x', 501),
        });
        Assert.Equal(HttpStatusCode.BadRequest, longMsg.StatusCode);

        // 2. Own job rejected -> 409 own_job
        var proOwnJob = SeedOpenCustomerJob(repo, FakeAdminRepository.Pro1Id, categoryId: 1);
        var ownJobResp = await client.PostAsJsonAsync($"/pro/jobs/{proOwnJob.Id}/offers", new
        {
            price = 2000,
            inspectionFee = 100,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Conflict, ownJobResp.StatusCode);
        using var ownJobDoc = JsonDocument.Parse(await ownJobResp.Content.ReadAsStringAsync());
        Assert.Equal("own_job", ownJobDoc.RootElement.GetProperty("code").GetString());

        // 3. Category mismatch rejected -> 409 category_mismatch (Pro1 has skills 1 and 2, not 3)
        var cat3Job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId, categoryId: 3);
        var catMismatchResp = await client.PostAsJsonAsync($"/pro/jobs/{cat3Job.Id}/offers", new
        {
            price = 2000,
            inspectionFee = 100,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Conflict, catMismatchResp.StatusCode);
        using var catDoc = JsonDocument.Parse(await catMismatchResp.Content.ReadAsStringAsync());
        Assert.Equal("category_mismatch", catDoc.RootElement.GetProperty("code").GetString());

        // 4. Valid first offer moves job from Open to Offers received and notifies customer
        var validResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2800,
            inspectionFee = 200,
            etaMinutes = 40,
            message = "Available with tools.",
        });
        Assert.Equal(HttpStatusCode.Created, validResp.StatusCode);
        using var validDoc = JsonDocument.Parse(await validResp.Content.ReadAsStringAsync());
        Assert.Equal("pending", validDoc.RootElement.GetProperty("status").GetString());
        Assert.Equal(JobStateMachine.OffersReceived, validDoc.RootElement.GetProperty("jobStatus").GetString());
        Assert.Equal(JobStateMachine.OffersReceived, repo.CustomerJobs[job.Id].Status);
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.NormalUserId && n.Type == "offer_received");

        // 5. Duplicate offer on same job returns 409 duplicate_offer
        var dupResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2600,
            inspectionFee = 100,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.Conflict, dupResp.StatusCode);
        using var dupDoc = JsonDocument.Parse(await dupResp.Content.ReadAsStringAsync());
        Assert.Equal("duplicate_offer", dupDoc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task EditAndWithdrawOffer_EnforceOwnershipAndPendingRules_AndKeepJobStatus()
    {
        var repo = new FakeAdminRepository();
        var job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId, categoryId: 1);
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());

        // Submit offer as Pro1
        var createResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 3000,
            inspectionFee = 300,
            etaMinutes = 45,
            message = "Initial quote.",
        });
        using var createDoc = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync());
        Guid offerId = createDoc.RootElement.GetProperty("id").GetGuid();

        // 1. Another professional (Pro2) trying to edit or withdraw Pro1's offer gets 404 (never 403)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro2Id.ToString());
        var otherEditResp = await client.PatchAsJsonAsync($"/pro/offers/{offerId}", new
        {
            price = 2500,
            inspectionFee = 100,
            etaMinutes = 30,
        });
        Assert.Equal(HttpStatusCode.NotFound, otherEditResp.StatusCode);

        var otherWithdrawResp = await client.PostAsync($"/pro/offers/{offerId}/withdraw", null);
        Assert.Equal(HttpStatusCode.NotFound, otherWithdrawResp.StatusCode);

        // 2. Pro1 edits pending offer while job is Offers received -> 200 OK
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());
        var editResp = await client.PatchAsJsonAsync($"/pro/offers/{offerId}", new
        {
            price = 2700,
            inspectionFee = 150,
            etaMinutes = 25,
            message = "Updated quote with lower price.",
        });
        Assert.Equal(HttpStatusCode.OK, editResp.StatusCode);
        Assert.Equal(2700m, repo.ProOffers[offerId].Price);
        Assert.Equal(150m, repo.ProOffers[offerId].InspectionFee);
        Assert.Equal(25, repo.ProOffers[offerId].EtaMinutes);

        // 3. Pro1 withdraws pending offer -> status becomes withdrawn, job status remains Offers received
        var withdrawResp = await client.PostAsync($"/pro/offers/{offerId}/withdraw", null);
        Assert.Equal(HttpStatusCode.OK, withdrawResp.StatusCode);
        Assert.Equal("withdrawn", repo.ProOffers[offerId].Status);
        Assert.Equal(JobStateMachine.OffersReceived, repo.CustomerJobs[job.Id].Status);

        // 4. Editing or withdrawing a non-pending (withdrawn) offer returns 409
        var editWithdrawnResp = await client.PatchAsJsonAsync($"/pro/offers/{offerId}", new
        {
            price = 2400,
            inspectionFee = 100,
            etaMinutes = 20,
        });
        Assert.Equal(HttpStatusCode.Conflict, editWithdrawnResp.StatusCode);

        var withdrawAgainResp = await client.PostAsync($"/pro/offers/{offerId}/withdraw", null);
        Assert.Equal(HttpStatusCode.Conflict, withdrawAgainResp.StatusCode);

        // 5. Resubmitting an offer on the same job after withdrawal returns 409 duplicate_offer
        var resubmitResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new
        {
            price = 2400,
            inspectionFee = 100,
            etaMinutes = 20,
        });
        Assert.Equal(HttpStatusCode.Conflict, resubmitResp.StatusCode);
    }

    [Fact]
    public async Task Start_MarkDone_CustomerComplete_And_Dispute_EnforceStateAndOwnershipRules()
    {
        var repo = new FakeAdminRepository();
        var job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId, categoryId: 1, status: JobStateMachine.Assigned);
        repo.CustomerJobs[job.Id] = job with { AssignedProfessionalId = FakeAdminRepository.Pro1Id };
        await using var factory = CreateFactory(repo);
        using var client = factory.CreateClient();

        // 1. Another professional (Pro2) attempting start, mark-done, or dispute gets 404 (never 403)
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro2Id.ToString());
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync($"/pro/jobs/{job.Id}/start", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/mark-done", new { note = "Done" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/dispute", new { reason = "Valid dispute reason here." })).StatusCode);

        // 2. Pro1 cannot mark-done while job is still Assigned -> 409 invalid_transition
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());
        var prematureMarkDone = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/mark-done", new { note = "Premature mark done" });
        Assert.Equal(HttpStatusCode.Conflict, prematureMarkDone.StatusCode);

        // 3. Pro1 starts work -> Assigned to In progress, sets workStartedAt, notifies customer (job_started)
        var startResp = await client.PostAsync($"/pro/jobs/{job.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResp.StatusCode);
        using var startDoc = JsonDocument.Parse(await startResp.Content.ReadAsStringAsync());
        Assert.Equal(JobStateMachine.InProgress, startDoc.RootElement.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, startDoc.RootElement.GetProperty("workStartedAt").ValueKind);
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.NormalUserId && n.Type == "job_started");

        // Starting again while In progress returns 409 invalid_transition
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/pro/jobs/{job.Id}/start", null)).StatusCode);

        // 4. Pro1 marks work as done -> sets professionalMarkedDoneAt, keeps status In progress, notifies customer (work_marked_done)
        var markDoneResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/mark-done", new
        {
            note = "Replaced pipe joint and tested water pressure.",
        });
        Assert.Equal(HttpStatusCode.OK, markDoneResp.StatusCode);
        using var markDoneDoc = JsonDocument.Parse(await markDoneResp.Content.ReadAsStringAsync());
        Assert.Equal(JobStateMachine.InProgress, markDoneDoc.RootElement.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, markDoneDoc.RootElement.GetProperty("professionalMarkedDoneAt").ValueKind);
        Assert.Contains(repo.Notifications, n => n.UserId == FakeAdminRepository.NormalUserId && n.Type == "work_marked_done");

        // 5. Mark-done twice returns 409 already_marked_done
        var markDoneTwiceResp = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/mark-done", new { note = "Second attempt" });
        Assert.Equal(HttpStatusCode.Conflict, markDoneTwiceResp.StatusCode);
        using var twiceDoc = JsonDocument.Parse(await markDoneTwiceResp.Content.ReadAsStringAsync());
        Assert.Equal("already_marked_done", twiceDoc.RootElement.GetProperty("code").GetString());

        // 6. Customer job detail includes professionalMarkedDoneAt and customer can complete the job
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.NormalUserId.ToString());
        var custDetailResp = await client.GetAsync($"/jobs/{job.Id}");
        Assert.Equal(HttpStatusCode.OK, custDetailResp.StatusCode);
        using var custDetailDoc = JsonDocument.Parse(await custDetailResp.Content.ReadAsStringAsync());
        Assert.NotEqual(JsonValueKind.Null, custDetailDoc.RootElement.GetProperty("professionalMarkedDoneAt").ValueKind);

        var custCompleteResp = await client.PostAsync($"/jobs/{job.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, custCompleteResp.StatusCode);
        Assert.Equal(JobStateMachine.Completed, repo.CustomerJobs[job.Id].Status);

        // 7. Dispute validation and transition on a second Assigned/In progress job
        var job2 = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId, categoryId: 1, status: JobStateMachine.InProgress);
        repo.CustomerJobs[job2.Id] = job2 with { AssignedProfessionalId = FakeAdminRepository.Pro1Id };

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());
        var shortDisputeResp = await client.PostAsJsonAsync($"/pro/jobs/{job2.Id}/dispute", new { reason = "Short" });
        Assert.Equal(HttpStatusCode.BadRequest, shortDisputeResp.StatusCode);

        var validDisputeResp = await client.PostAsJsonAsync($"/pro/jobs/{job2.Id}/dispute", new
        {
            reason = "Customer locked the premises and did not answer phone calls.",
        });
        Assert.Equal(HttpStatusCode.OK, validDisputeResp.StatusCode);
        Assert.Equal(JobStateMachine.Disputed, repo.CustomerJobs[job2.Id].Status);
    }

    [Fact]
    public async Task ProfessionalRateLimiter_Returns429WhenWindowExceeded()
    {
        var repo = new FakeAdminRepository();
        var job = SeedOpenCustomerJob(repo, FakeAdminRepository.NormalUserId);
        await using var factory = CreateFactory(repo, permitLimit: 2);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", FakeAdminRepository.Pro1Id.ToString());

        // Request 1 & 2 (even 400 validation counts against the caller's sliding window)
        await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new { price = 0, etaMinutes = 30 });
        await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new { price = 0, etaMinutes = 30 });

        var throttled = await client.PostAsJsonAsync($"/pro/jobs/{job.Id}/offers", new { price = 0, etaMinutes = 30 });
        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.True(throttled.Headers.Contains("Retry-After"));
    }
}
