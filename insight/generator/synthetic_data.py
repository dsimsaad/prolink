"""Generate labeled local-service jobs without inserting anything into Supabase."""

import argparse
from pathlib import Path

import pandas as pd
from faker import Faker

from app.schemas import TrainingJob

# Labels match db/seed/001_categories_areas.sql exactly. Category-specific
# symptoms carry the signal; Faker supplies varied, reproducible context.
SERVICE_EXAMPLES: dict[str, tuple[tuple[str, str], ...]] = {
    "Plumbing": (
        ("Leaking kitchen tap", "The faucet drips and the sink drain is blocked."),
        ("Water tank leakage", "Repair a leaking water pipe and replace the valve."),
        ("Toilet flush repair", "The bathroom toilet cistern overflows; need a plumber."),
        ("Low water pressure", "Inspect plumbing pipes, shower fittings and water supply."),
    ),
    "Electrical": (
        ("Breaker keeps tripping", "An electrician must fix wiring and a short circuit."),
        ("Install ceiling fan", "Connect electrical switches, sockets and fan wiring."),
        ("UPS inverter fault", "The UPS trips the circuit breaker during power outages."),
        ("Sparking wall socket", "Replace the burnt outlet and inspect electrical wiring."),
    ),
    "Painting": (
        ("Repaint bedroom walls", "Need a painter for interior paint, primer and wall finishing."),
        ("Exterior house painting", "Scrape peeling paint and apply weatherproof exterior coats."),
        ("Refresh ceiling paint", "Prepare surfaces and paint the ceiling with emulsion."),
        ("Paint living room", "Apply wall primer and two coats of paint with a roller."),
    ),
    "Carpentry": (
        ("Broken wardrobe hinges", "A carpenter should repair the wooden cabinet and door hinges."),
        ("Custom wooden shelves", "Build timber shelving and fit a wooden cupboard."),
        ("Repair dining table", "Fix loose furniture joints and polish the wooden table."),
        ("Stuck wooden door", "Adjust door frame, fit hinges and repair timber panels."),
    ),
    "AC repair and installation": (
        ("AC not cooling", "Air conditioner needs refrigerant gas refill and coil service."),
        ("Install split air conditioner", "Mount indoor and outdoor AC units and copper piping."),
        ("Air conditioner water leak", "Clean AC filters, condenser and condensate drain."),
        ("Inverter AC compressor fault", "HVAC technician needed for air conditioning repair."),
    ),
    "Masonry": (
        ("Repair brick boundary wall", "A mason must rebuild damaged brickwork using cement mortar."),
        ("Replace cracked floor tiles", "Lay ceramic tiles, grout and level the concrete floor."),
        ("Plaster damaged wall", "Repair masonry cracks with cement and sand plaster."),
        ("Build concrete steps", "Need a mason for brick construction and concrete stair repairs."),
    ),
    "Home cleaning": (
        ("Deep clean apartment", "Clean floors, kitchen grease, dust and bathroom surfaces."),
        ("Sofa steam cleaning", "Remove upholstery stains and shampoo carpets with steam."),
        ("Move out house cleaning", "Need cleaners to scrub, mop, vacuum and sanitize rooms."),
        ("Kitchen deep cleaning", "Degrease stove surfaces and clean cabinets and windows."),
    ),
    "Appliance repair": (
        ("Washing machine not spinning", "Repair washing machine motor, drum and control board."),
        ("Refrigerator not cooling", "Fridge thermostat and refrigerator compressor need repair."),
        ("Microwave oven fault", "An appliance technician must repair the microwave heating element."),
        ("Dishwasher stops mid cycle", "Inspect dishwasher pump, appliance motor and control board."),
    ),
}


def generate_synthetic_jobs(samples_per_category: int = 80, seed: int = 42) -> list[TrainingJob]:
    """Return balanced, deterministic samples with no real customer information."""
    if samples_per_category < 1:
        raise ValueError("samples_per_category must be positive")
    fake = Faker("en_GB")
    fake.seed_instance(seed)
    jobs: list[TrainingJob] = []
    for category, examples in SERVICE_EXAMPLES.items():
        for index in range(samples_per_category):
            title, description = examples[index % len(examples)]
            city = fake.random_element(("Islamabad", "Rawalpindi", "Lahore", "Karachi"))
            timing = fake.random_element(("this week", "tomorrow", "over the weekend", "today"))
            jobs.append(TrainingJob(
                title=title,
                description=f"{description} Service needed in {city} {timing}, near {fake.street_name()}.",
                category=category,
            ))
    fake.random.shuffle(jobs)
    return jobs


def main() -> None:
    """Export synthetic training records as CSV for inspection or experimentation."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples-per-category", type=int, default=80)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data/synthetic/jobs.csv")
    args = parser.parse_args()
    records = generate_synthetic_jobs(args.samples_per_category, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([job.model_dump() for job in records]).to_csv(args.output, index=False)
    print(f"Wrote {len(records)} synthetic jobs to {args.output}")


if __name__ == "__main__":
    main()
