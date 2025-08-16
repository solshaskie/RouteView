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

export interface Waypoint extends RoutePoint {
  heading: number;
}

export function generateWaypoints(
  route: DirectionsResult,
  intervalDistance: number
): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const leg = route.routes[0]?.legs[0];
  if (!leg) return waypoints;

  let allPoints: RoutePoint[] = [];
  for (const step of leg.steps) {
    if (step.polyline && step.polyline.points) {
      const decodedPoints = decode(step.polyline.points);
      allPoints = allPoints.concat(decodedPoints);
    }
  }

  if (allPoints.length < 2) {
    return [];
  }

  let distanceAccumulator = 0;
  for (let i = 0; i < allPoints.length - 1; i++) {
    const startPoint = allPoints[i];
    const endPoint = allPoints[i + 1];

    const segmentDistance = computeDistanceBetween(startPoint, endPoint);
    const segmentHeading = computeHeading(startPoint, endPoint);

    if (waypoints.length === 0) {
      waypoints.push({ ...startPoint, heading: segmentHeading });
    }

    distanceAccumulator += segmentDistance;

    while (distanceAccumulator >= intervalDistance) {
      const overflow = distanceAccumulator - intervalDistance;
      const ratio = 1 - (overflow / segmentDistance);
      const newPoint = interpolate(startPoint, endPoint, ratio);
      
      waypoints.push({ ...newPoint, heading: segmentHeading });
      
      distanceAccumulator = overflow;
    }
  }

  const lastHeading = waypoints[waypoints.length - 1]?.heading || 0;
  waypoints.push({ ...allPoints[allPoints.length - 1], heading: lastHeading });

  return waypoints;
}