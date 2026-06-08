import Matter from "matter-js";

import {
  createDefaultMeta,
  type KiwiMeta,
  type KiwiPitWorld,
} from "./types";

const { Bodies, Engine, World } = Matter;

const WALL_THICKNESS = 60;

function floorY(height: number) {
  return height + WALL_THICKNESS / 2 - 8;
}

export function createWorld(width: number, height: number): KiwiPitWorld {
  const engine = Engine.create({
    gravity: { x: 0, y: 1, scale: 0.00075 },
    enableSleeping: true,
  });

  const floor = Bodies.rectangle(
    width / 2,
    floorY(height),
    width + 200,
    WALL_THICKNESS,
    {
      isStatic: true,
      label: "floor",
      friction: 0.8,
      restitution: 0.05,
    },
  );

  const leftWall = Bodies.rectangle(
    -WALL_THICKNESS / 2,
    height / 2,
    WALL_THICKNESS,
    height * 2,
    { isStatic: true, label: "wall" },
  );

  const rightWall = Bodies.rectangle(
    width + WALL_THICKNESS / 2,
    height / 2,
    WALL_THICKNESS,
    height * 2,
    { isStatic: true, label: "wall" },
  );

  World.add(engine.world, [floor, leftWall, rightWall]);

  const meta = new WeakMap<Matter.Body, KiwiMeta>();

  return {
    engine,
    floor,
    leftWall,
    rightWall,
    bodies: [],
    pool: [],
    meta,
    width,
    height,
  };
}

export function resizeWorld(world: KiwiPitWorld, width: number, height: number) {
  world.width = width;
  world.height = height;

  Matter.Body.setPosition(world.floor, {
    x: width / 2,
    y: floorY(height),
  });
  Matter.Body.setPosition(world.leftWall, {
    x: -WALL_THICKNESS / 2,
    y: height / 2,
  });
  Matter.Body.setPosition(world.rightWall, {
    x: width + WALL_THICKNESS / 2,
    y: height / 2,
  });
}

export function resetWorld(world: KiwiPitWorld) {
  for (const body of world.bodies) {
    Matter.World.remove(world.engine.world, body);
    Matter.Body.setPosition(body, { x: -500, y: -500 });
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);
    world.meta.set(body, createDefaultMeta());
    world.pool.push(body);
  }

  world.bodies = [];
}
