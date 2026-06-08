import Matter from "matter-js";

import { pickGreenShade } from "./colors";
import {
  createDefaultMeta,
  LANDING_SPEED_THRESHOLD,
  type KiwiMeta,
  type KiwiPitWorld,
} from "./types";

function isStaticSurface(label: string) {
  return label === "floor" || label === "wall";
}

function markLanded(meta: KiwiMeta, now: number) {
  if (meta.landed) {
    return;
  }

  meta.landed = true;
  meta.greenColor = pickGreenShade();
  meta.fillStartTime = now;
}

export function setupLandingDetection(
  world: KiwiPitWorld,
  getNow: () => number,
) {
  const onCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
    const pairs = event.pairs;

    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;

      for (const body of [bodyA, bodyB]) {
        if (body.label !== "kiwi") {
          continue;
        }

        const other = body === bodyA ? bodyB : bodyA;
        const speed = Matter.Vector.magnitude(body.velocity);

        if (speed > LANDING_SPEED_THRESHOLD) {
          continue;
        }

        const meta = world.meta.get(body) ?? createDefaultMeta();

        if (isStaticSurface(other.label)) {
          markLanded(meta, getNow());
          world.meta.set(body, meta);
          continue;
        }

        if (other.label === "kiwi") {
          const otherMeta = world.meta.get(other);
          if (otherMeta?.landed || isRestingOnBody(body, other)) {
            markLanded(meta, getNow());
            world.meta.set(body, meta);
          }
        }
      }
    }
  };

  const onAfterUpdate = () => {
    for (const body of world.bodies) {
      if (body.label !== "kiwi" || !body.isSleeping) {
        continue;
      }

      const meta = world.meta.get(body);
      if (!meta || meta.landed) {
        continue;
      }

      markLanded(meta, getNow());
      world.meta.set(body, meta);
    }
  };

  Matter.Events.on(world.engine, "collisionStart", onCollision);
  Matter.Events.on(world.engine, "afterUpdate", onAfterUpdate);

  return () => {
    Matter.Events.off(world.engine, "collisionStart", onCollision);
    Matter.Events.off(world.engine, "afterUpdate", onAfterUpdate);
  };
}

function isRestingOnBody(body: Matter.Body, other: Matter.Body) {
  const verticalGap = other.position.y - body.position.y;
  const horizontalGap = Math.abs(other.position.x - body.position.x);
  const combinedRadius = (body.circleRadius ?? 0) + (other.circleRadius ?? 0);

  return (
    verticalGap > 0 &&
    verticalGap < combinedRadius * 1.2 &&
    horizontalGap < combinedRadius * 1.4 &&
    Math.abs(body.velocity.y) < LANDING_SPEED_THRESHOLD
  );
}
