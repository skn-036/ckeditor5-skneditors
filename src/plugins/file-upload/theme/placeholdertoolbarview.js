import View from '@ckeditor/ckeditor5-ui/src/view';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

import TrashIcon from '../theme/icons/trash-2.svg';
import DownloadIcon from '../theme/icons/download.svg';

export default class PlaceholderToolbarView extends View {
    constructor(locale) {
        super(locale);
        const bind = this.bindTemplate;

        this.downloadButton = this._createDownloadButton(locale);
        this.deleteButton = this._createDeleteButton(locale);

        this.setTemplate({
            tag: 'div',
            children: [this.downloadButton, this.deleteButton],
            attributes: {
                class: [
                    'skn-file-download-toolbar-container',

                    // Observable attributes control the state of the view in DOM.
                    bind.to('elementClass'),
                ],
            },
        });
    }

    _createDownloadButton(locale) {
        const view = new ButtonView(locale);

        view.set({
            label: 'Download file',
            icon: DownloadIcon,
            tooltip: true,
            class: 'skn-file-delete-button skn-file-download-toolbar-btn',
        });

        view.on('execute', () => {
            this.fire('download-file');
        });
        return view;
    }

    _createDeleteButton(locale) {
        const view = new ButtonView(locale);

        view.set({
            label: 'Delete file',
            icon: TrashIcon,
            tooltip: true,
            class: 'skn-file-delete-button skn-file-download-toolbar-btn',
        });

        view.on('execute', () => {
            this.fire('delete-file');
        });
        return view;
    }
}
