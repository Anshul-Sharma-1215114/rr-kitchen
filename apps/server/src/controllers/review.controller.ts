import type { Request, Response } from "express";
import { prisma } from "../prisma";

const FEATURED_LIMIT = 6;

// Public testimonials for the homepage: highest-rated reviews that have an
// actual comment (a bare star rating with no text doesn't read as a
// testimonial), most recent first as a tiebreak.
export async function listFeaturedReviews(_req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where: { rating: { gte: 4 }, comment: { not: null } },
    include: { customer: { select: { name: true } } },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: FEATURED_LIMIT,
  });

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      customerName: r.customer.name,
      createdAt: r.createdAt,
    })),
  });
}
