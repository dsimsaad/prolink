export type TileHue =
  | "emerald"
  | "amber"
  | "sky"
  | "rose"
  | "teal"
  | "violet";

export type CategoryIconKey =
  | "wrench"
  | "zap"
  | "paint-roller"
  | "hammer"
  | "wind"
  | "brick-wall"
  | "sparkles"
  | "settings";

export interface TradeCategory {
  /** Exact category name matching db/seed/001_categories_areas.sql */
  name: string;
  slug: string;
  href: string;
  shortDescription: string;
  overview: string;
  tasks: string[];
  image: string;
  imageAlt: string;
  tileHue: TileHue;
  iconKey: CategoryIconKey;
}

/**
 * Single source of truth for public-site configuration and trade categories.
 * Category names and order strictly match `db/seed/001_categories_areas.sql`.
 */
export const siteConfig = {
  name: "ProLink",
  city: "Lahore",
  supportEmail: "prolnk.support@gmail.com",
  disclosure:
    "ProLink is a university semester project. Some features are still in development.",
  categories: [
    {
      name: "Plumbing",
      slug: "plumbing",
      href: "/services#plumbing",
      shortDescription: "Local professionals",
      overview:
        "Pipe leak repairs, tap and mixer replacements, water motor fittings, drain unblocking, and bathroom sanitary installations.",
      tasks: [
        "Pipe leak detection & fitting repair",
        "Mixer tap, shower & flush tank replacement",
        "Kitchen & bathroom drain unblocking",
        "Water pump & overhead tank piping",
        "Geyser inlet/outlet plumbing connections",
      ],
      image: "/images/trades/plumbing.webp",
      imageAlt:
        "Hands in work gloves fitting a threaded metal pipe onto a white residential radiator with blue plumbing wrenches nearby",
      tileHue: "sky",
      iconKey: "wrench",
    },
    {
      name: "Electrical",
      slug: "electrical",
      href: "/services#electrical",
      shortDescription: "Local professionals",
      overview:
        "Switchboard repairs, circuit breaker replacements, ceiling fan and light installations, UPS wiring, and fault troubleshooting.",
      tasks: [
        "Distribution board & circuit breaker fixes",
        "Wall socket, dimmer & switchboard replacement",
        "Ceiling fan, exhaust fan & light fixture mounting",
        "UPS & inverter changeover wiring",
        "Short-circuit & tripping diagnosis",
      ],
      image: "/images/trades/electrical.webp",
      imageAlt:
        "Close-up of hands using an insulated screwdriver to mount two recessed wall electrical sockets into a white interior wall",
      tileHue: "amber",
      iconKey: "zap",
    },
    {
      name: "Painting",
      slug: "painting",
      href: "/services#painting",
      shortDescription: "Local professionals",
      overview:
        "Interior room repainting, wall putty and surface preparation, damp-patch touch-ups, ceiling coats, and door or grille enamel work.",
      tasks: [
        "Single-room & full-apartment interior painting",
        "Wall putty, sanding & primer preparation",
        "Ceiling repainting & moisture stain touch-ups",
        "Wooden door & window frame polish or enamel",
        "Boundary wall & metal gate weatherproof coats",
      ],
      image: "/images/trades/painting.webp",
      imageAlt:
        "Painter rolling fresh white paint along an upper interior wall above a masked window frame",
      tileHue: "rose",
      iconKey: "paint-roller",
    },
    {
      name: "Carpentry",
      slug: "carpentry",
      href: "/services#carpentry",
      shortDescription: "Local professionals",
      overview:
        "Door lock and hinge adjustments, wardrobe and kitchen cabinet repairs, shelving installation, and custom household woodwork.",
      tasks: [
        "Door alignment, latch & lock replacement",
        "Kitchen cabinet hinge & drawer runner repair",
        "Wardrobe shelving & sliding door adjustments",
        "Bed frame, table & wooden chair reinforcement",
        "Wall-mounted wooden shelves & curtain pelmets",
      ],
      image: "/images/trades/carpentry.webp",
      imageAlt:
        "Carpenter in a dark workshop apron shaping a solid timber board on a workbench with a wooden mallet and gouge chisel",
      tileHue: "emerald",
      iconKey: "hammer",
    },
    {
      name: "AC repair and installation",
      slug: "ac-repair-and-installation",
      href: "/services#ac-repair-and-installation",
      shortDescription: "Local professionals",
      overview:
        "Split AC indoor and outdoor servicing, cooling diagnostics, refrigerant pressure checks, drain line clearing, and unit mounting.",
      tasks: [
        "Split AC indoor coil & filter servicing",
        "Cooling check & refrigerant leak inspection",
        "Indoor & outdoor unit mounting and unmounting",
        "Water dripping & condensate drain cleaning",
        "Thermostat, capacitor & fan motor troubleshooting",
      ],
      image: "/images/trades/ac-repair-and-installation.webp",
      imageAlt:
        "White wall-mounted split air conditioner unit installed near the ceiling of a clean residential room",
      tileHue: "teal",
      iconKey: "wind",
    },
    {
      name: "Masonry",
      slug: "masonry",
      href: "/services#masonry",
      shortDescription: "Local professionals",
      overview:
        "Brickwork repairs, wall plastering, floor and bathroom tile fixing, grouting, boundary wall patching, and small civil maintenance.",
      tasks: [
        "Bricklaying & partition patching",
        "Interior & exterior cement plaster repair",
        "Floor, kitchen & bathroom tile replacement",
        "Tile re-grouting & threshold sill setting",
        "Driveway & courtyard paver leveling",
      ],
      image: "/images/trades/masonry.webp",
      imageAlt:
        "Close-up of a mason setting a red clay brick onto fresh mortar along a string line using a steel trowel",
      tileHue: "violet",
      iconKey: "brick-wall",
    },
    {
      name: "Home cleaning",
      slug: "home-cleaning",
      href: "/services#home-cleaning",
      shortDescription: "Local professionals",
      overview:
        "Kitchen and bathroom scrubbing, move-in or post-renovation cleanup, floor mopping, glass wiping, and upholstery surface care.",
      tasks: [
        "Full-home or apartment room-by-room cleaning",
        "Kitchen countertop, stove & cabinet degreasing",
        "Bathroom tile, sink & fixture descaling",
        "Move-in / move-out & post-paint cleanup",
        "Window glass, grille & balcony washing",
      ],
      image: "/images/trades/home-cleaning.webp",
      imageAlt:
        "Person wearing protective household gloves spraying surface cleaner onto a microfiber cloth beside a kitchen stove",
      tileHue: "sky",
      iconKey: "sparkles",
    },
    {
      name: "Appliance repair",
      slug: "appliance-repair",
      href: "/services#appliance-repair",
      shortDescription: "Local professionals",
      overview:
        "Troubleshooting and part replacement for household washing machines, refrigerators, microwave ovens, water dispensers, and stoves.",
      tasks: [
        "Automatic & semi-automatic washing machine repair",
        "Refrigerator & deep-freezer cooling diagnostics",
        "Microwave oven heating & turntable fixes",
        "Water dispenser thermostat & tap replacement",
        "Kitchen range hood & gas stove servicing",
      ],
      image: "/images/trades/appliance-repair.webp",
      imageAlt:
        "Close-up of a technician's hands using a screwdriver to service the internal pump and hose assembly of a home appliance",
      tileHue: "amber",
      iconKey: "settings",
    },
  ] satisfies TradeCategory[],
} as const;
