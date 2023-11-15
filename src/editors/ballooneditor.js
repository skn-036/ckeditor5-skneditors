import BalloonEditor from '@ckeditor/ckeditor5-editor-balloon/src/ballooneditor.js';
import defaultPlugins from '../utils/defaultplugins';
import defaultConfig from '../utils/defaultconfig';

class Editor extends BalloonEditor {}
Editor.builtinPlugins = defaultPlugins;
Editor.defaultConfig = defaultConfig;

export default Editor;
