import { RoutePoint } from "@/shared/types";
import {
  computeDistanceBetween,
  computeHeading,
  interpolate,
} from "spherical-geometry-js";
import decode from "decode-google-map-polyline";

type DirectionsResult = {
  routes: {
    legs: {
      steps: {
        polyline: {
          points: string;
        };
      }[];
    }[];
  }[];
};

// The waypoint no longer needs to store the heading.
export type Waypoint = RoutePoint;

export function generateWaypoints(
  route: DirectionsResult,
  intervalDistance: number
): Waypoint[] {
  let allPoints: RoutePoint[] = [];
  const leg = route.routes[0]?.legs[0];
  if (!leg) return [];

  for (const step of leg.steps) {
    if (step.polyline && step.polyline.points) {
      const decodedPoints = decode(step.polyline.points);
      allPoints = allPoints.concat(decodedPoints);
    }
  }

  if (allPoints.length < 2) return [];

  const waypoints: Waypoint[] = [];
  let distanceAccumulator = 0;

  // Add the very first point
  waypoints.push(allPoints[0]);

  for (let i = 0; i < allPoints.length - 1; i++) {
    const startPoint = allPoints[i];
    const endPoint = allPoints[i + 1];

    const segmentDistance = computeDistanceBetween(startPoint, endPoint);
    
    distanceAccumulator += segmentDistance;

    while (distanceAccumulator >= intervalDistance) {
      const overflow = distanceAccumulator - intervalDistance;
      const ratio = 1 - (overflow / segmentDistance);
      const newPoint = interpolate(startPoint, endPoint, ratio);
      
      waypoints.push(newPoint);
      
      distanceAccumulator = overflow;
    }
  }
  
  return waypoints;
}