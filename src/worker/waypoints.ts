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
  intervalDistance: number,
  smoothness: number = 1
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

  if (allPoints.length < 2) return waypoints;
  
  let totalDistance = 0;
  let nextWaypointDistance = 0;
  
  const smoothedPoints = createSmoothPath(allPoints, smoothness);
  
  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const point1 = smoothedPoints[i];
    const point2 = smoothedPoints[i + 1];
    const segmentDistance = computeDistanceBetween(point1, point2);
    while (totalDistance + segmentDistance >= nextWaypointDistance) {
      const distanceAlongSegment = nextWaypointDistance - totalDistance;
      const ratio = distanceAlongSegment / segmentDistance;
      const interpolatedPoint = interpolate(point1, point2, smoothCubic(ratio));
      let heading: number;
      if (waypoints.length === 0) {
        const lookAheadIndex = Math.min(i + Math.max(3, smoothness), smoothedPoints.length - 1);
        heading = computeHeading(interpolatedPoint, smoothedPoints[lookAheadIndex]);
      } else {
        const lookAheadDistance = Math.min(smoothness * 2, smoothedPoints.length - i - 1);
        const lookAheadPoint = smoothedPoints[i + lookAheadDistance];
        const rawHeading = computeHeading(interpolatedPoint, lookAheadPoint);
        const prevHeading = waypoints[waypoints.length - 1].heading;
        const momentum = Math.min(waypoints.length * 0.1, 0.8);
        heading = blendHeadingsWithMomentum(prevHeading, rawHeading, momentum, smoothness);
      }
      waypoints.push({
        lat: interpolatedPoint.lat,
        lng: interpolatedPoint.lng,
        heading: heading,
      });
      nextWaypointDistance += intervalDistance;
    }
    totalDistance += segmentDistance;
  }

  if (allPoints.length > 0) {
    const lastPoint = allPoints[allPoints.length - 1];
    const secondLastPoint = allPoints[allPoints.length - 2] || lastPoint;
    const finalHeading = computeHeading(secondLastPoint, lastPoint);
    waypoints.push({
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      heading: finalHeading,
    });
  }
  return waypoints;
}

function createSmoothPath(points: RoutePoint[], smoothness: number): RoutePoint[] {
  if (points.length <= 2) return points;
  const smoothedPoints: RoutePoint[] = [];
  const tension = Math.max(0.1, 1 - (smoothness * 0.2));
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    smoothedPoints.push(p1);
    const segments = Math.max(2, smoothness);
    for (let t = 1; t <= segments; t++) {
      const ratio = t / (segments + 1);
      const smoothedPoint = catmullRomSpline(p0, p1, p2, p3, ratio, tension);
      smoothedPoints.push(smoothedPoint);
    }
  }
  smoothedPoints.push(points[points.length - 1]);
  return smoothedPoints;
}

function catmullRomSpline(p0: RoutePoint, p1: RoutePoint, p2: RoutePoint, p3: RoutePoint, t: number, tension: number): RoutePoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const v0 = (p2.lat - p0.lat) * tension;
  const v1 = (p3.lat - p1.lat) * tension;
  const lat = p1.lat + v0 * t + (3 * (p2.lat - p1.lat) - 2 * v0 - v1) * t2 + (2 * (p1.lat - p2.lat) + v0 + v1) * t3;
  const v0lng = (p2.lng - p0.lng) * tension;
  const v1lng = (p3.lng - p1.lng) * tension;
  const lng = p1.lng + v0lng * t + (3 * (p2.lng - p1.lng) - 2 * v0lng - v1lng) * t2 + (2 * (p1.lng - p2.lng) + v0lng + v1lng) * t3;
  return { lat, lng };
}

function smoothCubic(t: number): number {
  return t * t * (3 - 2 * t);
}

function blendHeadingsWithMomentum(heading1: number, heading2: number, momentum: number, smoothness: number): number {
  heading1 = ((heading1 % 360) + 360) % 360;
  heading2 = ((heading2 % 360) + 360) % 360;
  let diff = heading2 - heading1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const easedMomentum = smoothCubic(momentum);
  const smoothnessFactor = Math.max(0.3, 1 - (smoothness * 0.1));
  const blended = heading1 + (diff * easedMomentum * smoothnessFactor);
  return ((blended % 360) + 360) % 360;
}