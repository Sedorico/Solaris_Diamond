export const siteConfig = {
  name: "Solaris Diamond",
  shortName: "Solaris",
  tagline: "The operating system for modern business.",
  description:
    "Solaris Diamond is a premium all-in-one business management platform. Subscribe to the services you need — inventory, sales, expenses, POS and attendance — and run everything from one elegant dashboard.",
  url: "https://solarisdiamond.com",
  ogImage: "/og.png",
  email: "hello@solarisdiamond.com",
  twitter: "@solarisdiamond",
  currency: "PHP",
} as const;

export const mainNav = [
  { title: "Services", href: "/services" },
  { title: "Bundles", href: "/bundles" },
  { title: "Pricing", href: "/pricing" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
] as const;

export const footerNav = [
  {
    title: "Product",
    links: [
      { title: "Services", href: "/services" },
      { title: "Bundles", href: "/bundles" },
      { title: "Pricing", href: "/pricing" },
      { title: "Changelog", href: "/#" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About", href: "/about" },
      { title: "Contact", href: "/contact" },
      { title: "Careers", href: "/#" },
      { title: "Blog", href: "/#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { title: "Documentation", href: "/#" },
      { title: "Help Center", href: "/#" },
      { title: "API Status", href: "/#" },
      { title: "Security", href: "/#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Privacy", href: "/#" },
      { title: "Terms", href: "/#" },
      { title: "Data Processing", href: "/#" },
      { title: "Cookies", href: "/#" },
    ],
  },
] as const;
