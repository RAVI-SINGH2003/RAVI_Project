import cleanDocument from './utility/clean_document';
import Page from './core/page';
import Bbox from './utility/bbox';
import { Line } from './core/line';
import { Glyph } from './utility/components';
import { Util } from './utility/utils';
import { ConComp } from './core/connected_components';
import Dokument from './core/dokument';
import { Characteristics } from './global/characteristics';
import { Workflow } from './core/workflow';

export const cleanDoc = cleanDocument;
export const page = Page;
export const util = Util;
export const bbox = Bbox;
export const glyph = Glyph;
export const conComp = ConComp;
export const dokument = Dokument;
export const document = Dokument; // For backword compatibility
export const line = Line;
export const characteristics = Characteristics;
export const workflow = Workflow;
