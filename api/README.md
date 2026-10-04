# ProLink Core Engine (`api/`)

## Purpose
The Core Engine is a high-performance C# ASP.NET Core Web API containing a custom Data Structures and Algorithms (DSA) library. It handles core business workflows including job creation/status state transitions, offers, professional matching and ranking, full-text inverted index search, rate limiting, and Supabase JWT authentication.

## Planned Owner
- **Lead**: P3 (C# Engine Lead)

## Planned Structure & Files
```text
api/
├── Dockerfile                   Docker container configuration for Render deployment
├── ProLink.sln                  Visual Studio / .NET Solution file
├── ProLink.Engine/              DSA library (zero database or web dependencies)
│   ├── Structures/              Trie.cs, MinHeap.cs, PriorityQueue.cs, LruCache.cs, Queue.cs
│   ├── Algorithms/              MergeSort.cs, Dijkstra.cs
│   ├── Search/                  InvertedIndex.cs, Autocomplete.cs, Tokenizer.cs
│   ├── Matching/                JobMatcher.cs, ScoringEngine.cs, GeoDistance.cs
│   └── RateLimiting/            SlidingWindowLimiter.cs, TokenBucket.cs
├── ProLink.Engine.Tests/        xUnit unit tests for data structures and algorithms
│   ├── StructuresTests/         TrieTests.cs, MinHeapTests.cs, LruCacheTests.cs
│   ├── AlgorithmsTests/         SortTests.cs, ShortestPathTests.cs
│   ├── SearchTests/             InvertedIndexTests.cs
│   └── MatchingTests/           ScoringTests.cs
├── ProLink.Bench/               BenchmarkDotNet harness for DSA performance benchmarking
│   └── Benchmarks.cs
└── ProLink.Api/                 ASP.NET Core Web API (HTTP host and endpoints)
    ├── Controllers/             JobsController.cs, OffersController.cs, SearchController.cs
    ├── Services/                MatchingService.cs, NotificationService.cs
    ├── Models/                  JobDto.cs, OfferDto.cs, ProfessionalDto.cs
    ├── Auth/                    SupabaseJwtHandler.cs, JwtOptions.cs
    ├── Data/                    PostgresRepository.cs, DbConnectionFactory.cs
    ├── Program.cs               Application bootstrapping, DI, middleware pipeline
    └── appsettings.json         Configuration settings
```

## What Will Go Inside
- **`ProLink.Engine`**: Pure DSA implementations without external web/DB dependencies, enabling unit testing and standalone benchmarking.
- **`ProLink.Engine.Tests`**: Rigorous xUnit test suites validating correctness and edge cases of custom data structures and matching algorithms.
- **`ProLink.Bench`**: BenchmarkDotNet benchmarks to measure latency, throughput, and memory allocations.
- **`ProLink.Api`**: ASP.NET Core controllers exposing REST APIs, validating Supabase JWT tokens on every request, and interfacing with Postgres.

## How to Run: TODO
Run these commands when ready to initialize the .NET solution and projects:

```bash
# 1. Create solution
dotnet new sln -n ProLink -o api

# 2. Create projects
dotnet new classlib -n ProLink.Engine -o api/ProLink.Engine
dotnet new xunit -n ProLink.Engine.Tests -o api/ProLink.Engine.Tests
dotnet new console -n ProLink.Bench -o api/ProLink.Bench
dotnet new webapi -n ProLink.Api -o api/ProLink.Api

# 3. Add projects to solution
dotnet sln api/ProLink.sln add api/ProLink.Engine/ProLink.Engine.csproj
dotnet sln api/ProLink.sln add api/ProLink.Engine.Tests/ProLink.Engine.Tests.csproj
dotnet sln api/ProLink.sln add api/ProLink.Bench/ProLink.Bench.csproj
dotnet sln api/ProLink.sln add api/ProLink.Api/ProLink.Api.csproj

# 4. Add project references
dotnet add api/ProLink.Engine.Tests reference api/ProLink.Engine
dotnet add api/ProLink.Bench reference api/ProLink.Engine
dotnet add api/ProLink.Api reference api/ProLink.Engine

# 5. Run tests
dotnet test api/ProLink.sln

# 6. Run API locally
dotnet run --project api/ProLink.Api
```
The API will run locally at [http://localhost:5000](http://localhost:5000) (or specified port).
