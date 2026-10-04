-- ==============================================================================
-- Seed: 001_categories_areas.sql
-- Purpose: Initial lookup dataset for service trade categories, placeholder areas, and graph edges
-- Order: Apply after migrations 001, 002, 003
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Trade Categories
-- ------------------------------------------------------------------------------

INSERT INTO public.categories (name, is_active)
VALUES
    ('Plumbing', true),
    ('Electrical', true),
    ('Painting', true),
    ('Carpentry', true),
    ('AC repair and installation', true),
    ('Masonry', true),
    ('Home cleaning', true),
    ('Appliance repair', true)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Service Areas (PLACEHOLDER DATA)
-- ==============================================================================
-- !!! LOUD NOTICE FOR PRODUCTION DEPLOYMENT !!!
-- The areas and travel times below are SYNTHETIC PLACEHOLDERS (Area 01 to Area 12)
-- representing an abstract connected urban graph.
-- YOU MUST REPLACE THESE PLACEHOLDERS WITH REAL CITY SECTORS / NEIGHBORHOODS
-- AND ACCURATE LOCAL TRAVEL DURATIONS (e.g. Lahore, Karachi, or Islamabad)
-- PRIOR TO LAUNCHING REAL USER ONBOARDING.
-- ==============================================================================
-- ------------------------------------------------------------------------------

INSERT INTO public.areas (name, lat, lng)
VALUES
    ('Area 01', 31.520370, 74.358747),
    ('Area 02', 31.530000, 74.340000),
    ('Area 03', 31.510000, 74.370000),
    ('Area 04', 31.490000, 74.350000),
    ('Area 05', 31.500000, 74.320000),
    ('Area 06', 31.540000, 74.360000),
    ('Area 07', 31.480000, 74.310000),
    ('Area 08', 31.470000, 74.380000),
    ('Area 09', 31.550000, 74.330000),
    ('Area 10', 31.460000, 74.340000),
    ('Area 11', 31.560000, 74.370000),
    ('Area 12', 31.450000, 74.360000)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. Area Travel-Time Graph Edges (Dijkstra Shortest Path Feature)
-- Note: Edges are directed; bidirectional routes are inserted symmetrically.
-- ------------------------------------------------------------------------------

WITH area_map AS (
    SELECT id, name FROM public.areas WHERE name LIKE 'Area %'
)
INSERT INTO public.area_edges (from_area, to_area, minutes)
SELECT 
    a1.id AS from_area, 
    a2.id AS to_area, 
    edges.minutes
FROM (
    VALUES
        -- Core Hub Connections (Area 01 as central node)
        ('Area 01', 'Area 02', 15), ('Area 02', 'Area 01', 15),
        ('Area 01', 'Area 03', 12), ('Area 03', 'Area 01', 12),
        ('Area 01', 'Area 04', 18), ('Area 04', 'Area 01', 18),
        ('Area 01', 'Area 06', 10), ('Area 06', 'Area 01', 10),

        -- Western Cluster
        ('Area 02', 'Area 05', 14), ('Area 05', 'Area 02', 14),
        ('Area 05', 'Area 07', 16), ('Area 07', 'Area 05', 16),
        ('Area 02', 'Area 09', 20), ('Area 09', 'Area 02', 20),

        -- Eastern / Southern Cluster
        ('Area 03', 'Area 08', 22), ('Area 08', 'Area 03', 22),
        ('Area 04', 'Area 08', 15), ('Area 08', 'Area 04', 15),
        ('Area 04', 'Area 10', 14), ('Area 10', 'Area 04', 14),
        ('Area 07', 'Area 10', 18), ('Area 10', 'Area 07', 18),
        ('Area 10', 'Area 12', 12), ('Area 12', 'Area 10', 12),
        ('Area 08', 'Area 12', 17), ('Area 12', 'Area 08', 17),

        -- Northern Cluster
        ('Area 06', 'Area 09', 14), ('Area 09', 'Area 06', 14),
        ('Area 06', 'Area 11', 11), ('Area 11', 'Area 06', 11),
        ('Area 03', 'Area 11', 19), ('Area 11', 'Area 03', 19)
) AS edges(from_name, to_name, minutes)
JOIN area_map a1 ON a1.name = edges.from_name
JOIN area_map a2 ON a2.name = edges.to_name
ON CONFLICT (from_area, to_area) DO NOTHING;
