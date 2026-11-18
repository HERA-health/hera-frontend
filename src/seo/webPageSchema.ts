export function webPageSchema(title: string, description: string, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "es",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.health-hera.com/" },
        { "@type": "ListItem", position: 2, name: title, item: canonical },
      ],
    },
  };
}
