import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import defaultPlugins from '../utils/defaultplugins';
import defaultConfig from '../utils/defaultconfig';

class Editor extends ClassicEditor {}
Editor.builtinPlugins = defaultPlugins;
Editor.defaultConfig = defaultConfig;

export default Editor;
