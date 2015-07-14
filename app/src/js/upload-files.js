/**
 * Model, Collection and View for Filelist.
 */

var FileModel = Backbone.Model.extend({

    defaults: {
        id: null,
        filename: null,
        title: "Untitled",
        order: 1,
        progress: 0,
        element: null
    },

    initialize: function () {
    }

});

var Filelist = Backbone.Collection.extend({

    model: FileModel,

    comparator: function (upload) {
        return upload.get('order');
    },

    setOrder: function (id, order, title) {
        _.each(this.models, function (item) {
            if (item.get('id') === id) {
                item.set('order', order);
                item.set('title', title);
            }
        });
    }

});

var FilelistHolder = Backbone.View.extend({

    initialize: function (options) {
        this.list = new Filelist();
        this.uploading = new Filelist();
        this.type = options.type;
        if (options.type === 'ImageList') {
            this.idPrefix = '#imagelist-';
            this.datWrongtype = 'field.imagelist.message.wrongtype';
            this.datRemove = 'field.imagelist.message.remove';
            this.datRemoveMulti = 'field.imagelist.message.removeMulti';
            this.tmplEmpty = 'field.imagelist.template.empty';
            this.tmplItem = 'field.imagelist.template.item';
            this.tmplProgress = 'field.imagelist.template.progress';
        } else {
            this.idPrefix = '#filelist-';
            this.datWrongtype = 'field.filelist.message.wrongtype';
            this.datRemove = 'field.filelist.message.remove';
            this.datRemoveMulti = 'field.filelist.message.removeMulti';
            this.tmplEmpty = 'field.filelist.template.empty';
            this.tmplItem = 'field.filelist.template.item';
            this.tmplProgress = 'field.filelist.template.progress';
        }

        var prelist = $('#' + this.id).val();
        if (prelist !== "") {
            prelist = $.parseJSON($('#' + this.id).val());
            _.each(prelist, function (item) {
                this.list.add(
                    new FileModel({
                        filename: item.filename,
                        title: item.title,
                        id: this.list.length
                    })
                );
            }, this);
        }
        this.render();
        this.bindEvents();
    },

    render: function () {
        this.list.sort();

        var list = $(this.idPrefix + this.id + ' .list'),
            data = list.data('list'),
            listtype = this.type,
            tmplItem = this.tmplItem,
            tmplProgress = this.tmplProgress,
            progress = $(this.idPrefix + this.id + ' .uploading-list');

        list.html('');
        _.each(this.list.models, function (file) {
            var replace = {
                    '%ID%':    file.get('id'),
                    '%VAL%':   _.escape(file.get('title')),
                    '%PATH%':  Bolt.conf('paths.bolt'),
                    '%FNAME%': file.get('filename')
                },
                element = $(Bolt.data(tmplItem, replace));

            if (listtype === 'ImageList') {
                element.find('.thumbnail-link').magnificPopup({type: 'image'});
            }
            list.append(element);
        });

        progress.html('');
        if (_.isEmpty(this.uploading.models)) {
            progress.addClass('hide');
        } else {
            progress.removeClass('hide');
        }
        _.each(this.uploading.models, function (file) {
            var replace = {
                    '%FNAME%':    file.get('filename')
                },
                element = $(Bolt.data(tmplProgress, replace)),
                progressBar = element.find('.progress-bar');

            progressBar.css('width', Math.round((file.progress || 0) * 100) + '%');
            file.element = element;
            progress.append(element);
        });

        if (this.list.models.length === 0) {
            list.append(Bolt.data(this.tmplEmpty));
        }
        this.serialize();
    },

    add: function (filename, title) {
        this.list.add(
            new FileModel({
                filename: filename,
                title: title,
                id: this.list.length
            })
        );
        this.render();
    },

    remove: function (id, dontRender) {
        var done = false;
        _.each(this.list.models, function (item) {
            if (!done && item.get('id') === id) {
                this.list.remove(item);
                done = true;
            }
        }, this);

        if (!dontRender) {
            this.render();
        }
    },

    serialize: function () {
        var ser = JSON.stringify(this.list);
        $('#' + this.id).val(ser);
    },

    doneSort: function () {
        var list = this.list; // jQuery's .each overwrites 'this' scope, set it here.
        $(this.idPrefix + this.id + ' .list div').each(function (index) {
            var id = $(this).data('id'),
                title = $(this).find('input').val();

            list.setOrder(id, index, title);
        });
        this.render();
    },

    bindEvents: function () {
        var $this = this,
            contentkey = this.id,
            $holder = $(this.idPrefix + this.id);

        $holder.find("div.list").sortable({
            helper: function (e, item) {
                if (!item.hasClass('selected')) {
                    item.toggleClass('selected');
                }

                return $('<div></div>');
            },
            start: function (e, ui) {
                var elements = $holder.find('.selected').not('.ui-sortable-placeholder');


                var len = elements.length;

                var currentOuterHeight = ui.placeholder.outerHeight(true),
                    currentInnerHeight = ui.placeholder.height(),
                    margin = parseInt(ui.placeholder.css('margin-top')) + parseInt(ui.placeholder.css('margin-bottom'));

                elements.css('display', 'none');

                ui.placeholder.height(currentInnerHeight + len * currentOuterHeight - currentOuterHeight - margin);

                ui.item.data('items', elements);
            },
            beforeStop: function (e, ui) {
                ui.item.before(ui.item.data('items'));
            },
            stop: function () {
                $holder.find('.ui-state-active').css('display', '');
                $this.doneSort();
            },
            delay: 100,
            distance: 5
        });

        $('#fileupload-' + contentkey)
            .fileupload({
                dataType: 'json',
                dropZone: $holder,
                pasteZone: null,
                done: function (e, data) {
                    $.each(data.result, function (index, file) {
                        var filename = decodeURI(file.url).replace("files/", "");
                        $this.add(filename, filename);
                    });
                },
                add: bindFileUpload.checkFileSize
            })
            .bind('fileuploadsubmit', function (e, data) {
                var fileTypes = $('#fileupload-' + contentkey).attr('accept'),
                    pattern,
                    ldata = $($this.idPrefix + contentkey + ' div.list').data('list');

                if (typeof fileTypes !== 'undefined') {
                    pattern = new RegExp("\\.(" + fileTypes.replace(/,/g, '|').replace(/\./g, '') + ")$", "i");
                    $.each(data.files , function (index, file) {
                        if (!pattern.test(file.name)) {
                            alert(Bolt.data($this.datWrongtype, {'%TYPELIST%': ldata.typelist}));
                            e.preventDefault();

                            return false;
                        }

                        var uploadingFile = new FileModel({
                            filename: file.name
                        });
                        file.uploading = uploadingFile;

                        $this.uploading.add(uploadingFile);
                    });
                }

                $this.render();
            })
            .bind('fileuploadprogress', function (e, data) {
                var progress = data.loaded / data.total;

                _.each(data.files, function (file, index) {
                    file.uploading.progress = progress;
                    var progressBar = file.uploading.element.find('.progress-bar');
                    progressBar.css('width', Math.round(file.uploading.progress * 100) + '%');
                });
            })
            .bind('fileuploadalways', function (e, data) {
                _.each(data.files, function (file, index) {
                    $this.uploading.remove(file.uploading);
                });
                $this.render();
            });

        var lastClick = null;
        $holder.find('div.list').on('click', '.list-item', function (e) {
            if ($(e.target).hasClass('list-item')) {
                if (e.shiftKey) {
                    if (lastClick) {
                        var currentIndex = $(this).index(),
                            lastIndex = lastClick.index();

                        if (lastIndex > currentIndex) {
                            $(this).nextUntil(lastClick).add(this).add(lastClick).addClass('selected');
                        } else if (lastIndex < currentIndex) {
                            $(this).prevUntil(lastClick).add(this).add(lastClick).addClass('selected');
                        } else {
                            $(this).toggleClass('selected');
                        }
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    $(this).toggleClass('selected');
                } else {
                    $holder.find('.list-item').not($(this)).removeClass('selected');
                    $(this).toggleClass('selected');
                }

                if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !$(this).hasClass('selected')) {
                    lastClick = null;
                } else {
                    lastClick = $(this);
                }
            }
        });

        $holder.find('.remove-selected-button').on('click', function (e) {
            if (confirm(Bolt.data($this.datRemoveMulti))) {
                $holder.find('.selected').each(function () {
                    $this.remove($(this).data('id'), true);
                });
                $this.render();
            }
        });

        $holder.find('div.list').on('click', '.remove-button', function (e) {
            e.preventDefault();

            if (confirm(Bolt.data($this.datRemove))) {
                $this.remove($(this).parent().data('id'));
            }
        });

        $holder.find("div.list").on('blur', 'input', function () {
            $this.doneSort();
        });

        if (this.type === 'ImageList') {
            // In the modal dialog, to navigate folders.
            $('#selectImageModal-' + contentkey).on('click', '.folder', function (e) {
                e.preventDefault();
                $('#selectImageModal-' + contentkey + ' .modal-content').load($(this).data('action'));
            });

            // In the modal dialog, to select a file.
            $('#selectImageModal-' + contentkey).on('click', '.file', function (e) {
                e.preventDefault();
                var filename = $(this).data('action');
                $this.add(filename, filename);
            });
        }
    }

});
