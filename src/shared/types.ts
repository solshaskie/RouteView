import z from "zod";

export const RoutePointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

export type RoutePoint = z.infer<typeof RoutePointSchema>;

export const RouteSchema = z.object({
  pointA: RoutePointSchema,
  pointB: RoutePointSchema,
  distance: z.string().optional(),
  duration: z.string().optional(),
});

export type Route = z.infer<typeof RouteSchema>;
