/**
 * LCA Editor Components
 *
 * Components for editing building elements and material layers in LCA projects.
 *
 * @module features/lca/components/editor
 */

export { ElementList } from './ElementList';
export type { ElementListProps } from './ElementList';

export { ElementEditor } from './ElementEditor';
export type { ElementEditorProps } from './ElementEditor';

export { LayerEditor } from './LayerEditor';
export type { LayerEditorProps } from './LayerEditor';

export { LayerRow } from './LayerRow';
export type { LayerRowProps } from './LayerRow';

export { MaterialSelector } from './MaterialSelector';
export type { MaterialSelectorProps } from './MaterialSelector';

export { MaterialBenchmark } from './MaterialBenchmark';
export type { MaterialBenchmarkProps, BenchmarkStats } from './MaterialBenchmark';

export { MaterialAlternatives } from './MaterialAlternatives';
export type { MaterialAlternativesProps, AlternativeMaterial } from './MaterialAlternatives';
