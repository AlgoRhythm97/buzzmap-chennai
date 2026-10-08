// Types for mosquito-models.js (procedural Three.js mosquito reconstructions, v3).
import type { Group } from 'three';

export declare const SPECIES: Readonly<{
  AEDES_AEGYPTI: 'aedes-aegypti';
  AEDES_ALBOPICTUS: 'aedes-albopictus';
  ANOPHELES_ARABIENSIS: 'anopheles-arabiensis';
  ANOPHELES_GAMBIAE: 'anopheles-gambiae';
  CULEX_PIPIENS: 'culex-pipiens';
  CULEX_QUINQUEFASCIATUS: 'culex-quinquefasciatus';
}>;

export type MosquitoModelId = (typeof SPECIES)[keyof typeof SPECIES];
export type WingPose = 'flight' | 'rest';

export interface MosquitoOptions {
  /** 'low' reduces scales, eye lenses and fine hairs (~5x fewer triangles). */
  quality?: 'high' | 'low';
  /** Demonstration wingbeat rate of the animation clip, 1-30 Hz. */
  wingHz?: number;
  scale?: number;
}

export interface MosquitoControls {
  species: MosquitoModelId;
  label: string;
  /** Advance the wing animation; call once per frame. */
  update(deltaSeconds: number, animateBody?: boolean): void;
  setWingSpeed(multiplier: number): void;
  setPose(pose: WingPose): void;
  /** Free geometries, materials and textures after removing from the scene. */
  dispose(): void;
}

export type MosquitoModel = Group & { userData: MosquitoControls };

export declare function createMosquito(species?: MosquitoModelId, options?: MosquitoOptions): MosquitoModel;
export declare function listMosquitoSpecies(): { id: MosquitoModelId; label: string }[];
