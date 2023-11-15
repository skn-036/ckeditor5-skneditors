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
        url: null,
        additionalRequestPayload: null,
        deleteUrl: null, // if delete url provided on the delete action, a http DELETE request will be sent in this url
        onDelete: null, // (attrs, (deleted) => void, element) => boolean
        // if this function is provided, it will be given hightest priority. on the file delete this function will be executed
        onUploadSuccess: null,
        withCredentials: true,
        headers: {
            'X-CSRF-TOKEN': null,
            Authorization: null,
        },

        fileTypes: [],
        disableRemoveByKeyboard: false,
        disableDrag: false,
        uploadedBy: null, // () => ({ id: any, name: string, variantColor: css color })
    },
    customButton: {
        label: 'Save',
        icon: false,
        onClick: null,
    },
};
