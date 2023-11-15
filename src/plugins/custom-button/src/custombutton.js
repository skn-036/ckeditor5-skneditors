import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';

export default class CustomButton extends Plugin {
    init() {
        const editor = this.editor;
        const option = editor.config.get('customButton');

        editor.ui.componentFactory.add('customButton', (locale) => {
            const view = new ButtonView(locale);
            view.set({
                label: option && option.label ? option.label : 'Save',
                keystroke: 'Ctrl+S',
                tooltip: true,
                withText: true,
                icon: option?.icon ? option?.icon : undefined,
                class: `custom-btn${
                    option && option.class ? ` ${option.class}` : ''
                }`,
            });
            view.on('execute', (evt) => {
                if (
                    option &&
                    option.onClick &&
                    typeof option.onClick === 'function'
                )
                    option.onClick(evt);
            });
            return view;
        });
    }
}
