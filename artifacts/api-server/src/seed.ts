import { db } from "@workspace/db";
import { workLogs } from "@workspace/db/schema";

export async function seedWorkLogs() {
  const existing = await db.select().from(workLogs);
  if (existing.length > 0) return;

  console.log("Seeding work logs...");
  await db.insert(workLogs).values([
    {
      title: "E-commerce Platform Optimization",
      description: "Improved core web vitals and reduced load time by 40%.",
      category: "Web Development",
      stats: "Score: 98/100",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
      tags: ["Performance", "React", "Node.js"],
    },
    {
      title: "Automated SEO Audit Tool",
      description: "Built a custom crawler to identify indexing issues across 50k+ pages.",
      category: "SEO Systems",
      stats: "Processed: 50k Pages",
      imageUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80",
      tags: ["Python", "SEO", "Automation"],
    },
    {
      title: "DDoS Mitigation Layer",
      description: "Implemented rate limiting and IP filtering for a high-traffic SaaS.",
      category: "DDoS Mitigation",
      stats: "Blocked: 1M+ Requests",
      imageUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80",
      tags: ["Security", "Nginx", "Cloudflare"],
    },
  ]);
  console.log("Work logs seeded.");
}
