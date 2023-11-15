import InlineEditor from '@ckeditor/ckeditor5-editor-inline/src/inlineeditor';
import defaultPlugins from '../utils/defaultplugins';
import defaultConfig from '../utils/defaultconfig';

class Editor extends InlineEditor {}
Editor.builtinPlugins = defaultPlugins;
Editor.defaultConfig = defaultConfig;

export default Editor;
