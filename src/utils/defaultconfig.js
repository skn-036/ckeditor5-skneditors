export default {
    toolbar: {
        items: [
            'heading',
            'bold',
            'italic',
            'underline',
            'link',
            '|',
            'insertTable',
            'fontBackgroundColor',
            'fontColor',
            'fontFamily',
            'fontSize',
            '|',
            'alignment',
            'todoList',
            'bulletedList',
            'numberedList',
            'outdent',
            'indent',
            '|',
            'imageInsert',
            'mediaEmbed',
            // 'fileUpload', should be enabled on config if custom file upload need to be activated
            '|',
            'subscript',
            'superscript',
            'strikethrough',
            'blockQuote',
            'highlight',
            'horizontalLine',
            'pageBreak',
            'removeFormat',
            'findAndReplace',
            'undo',
            'redo',
        ],
    },
    language: 'en',
    image: {
        toolbar: [
            'imageTextAlternative',
            'imageStyle:inline',
            'imageStyle:block',
            'imageStyle:side',
        ],
    },
    table: {
        contentToolbar: [
            'tableColumn',
            'tableRow',
            'mergeTableCells',
            'tableCellProperties',
            'tableProperties',
        ],
    },
    simpleFileUpload: {
        url: 'http://my-custom-link.com',
        deleteUrl: null, // if delete url provided on the delete action, a http DELETE request will be sent in this url
        onDelete: null, // if this function is provided, it will be given hightest priority. on the file delete this function will be executed
        onUploadSuccess: null,
        withCredentials: true,
        headers: {
            'X-CSRF-TOKEN': 'CSRF_TOKEN',
            Authorization: 'Bearer <JSON Web Token>',
        },

        fileTypes: [],
        disableRemoveByKeyboard: false,
        disableDrag: false,
    },
    customButton: {
        label: 'Save',
        icon: false,
        onClick: (evt, data) => {
            console.log('custom button clicked', evt, data);
        },
    },
};
