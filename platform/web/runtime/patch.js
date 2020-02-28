import * as nodeOps from './nodeOps.js';
import {createPatchFunction} from "../../../VDOM/patch.js";
export const patch = createPatchFunction({nodeOps});