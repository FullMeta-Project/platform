import { mountRegisteredEditor } from "./js/editor-host.js";
import {mountLoaderFailure} from './ui/workspace/loader-view.js';

const container = document.querySelector('#editor-host');
try {
  const parameters = new URLSearchParams(location.search);
  await mountRegisteredEditor(container, {
    modelPath: parameters.get('model'),
    action: parameters.get('action'),
  });
} catch (error) {
  mountLoaderFailure(container,error.message);
}
