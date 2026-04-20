import {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateSoftwareAppSchema,
} from "@/lib/metadata";

export default function StructuredData() {
  const websiteSchema = generateWebsiteSchema();
  const orgSchema = generateOrganizationSchema();
  const appSchema = generateSoftwareAppSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(orgSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(appSchema),
        }}
      />
    </>
  );
}
