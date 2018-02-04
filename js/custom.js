const DEFAUL_COLORS = ['purple', 'pink', 'blue', 'green', 'red', 'orange'];
let DB = null,
	highestID = 0,
    highestInd = 0,
    captured = null;

if (window.openDatabase) {
    DB = openDatabase("DiProjects", "1.0", "Stikies", 10000000);
} else {
    alert("Failed to open database, make sure your browser supports HTML5 web storage");
}

function addNewNote() {
    let note = new Note();
    note.id = ++highestID;
    note.timestamp = new Date().getTime();
    note.left = Math.round(Math.random() * 400) + 'px';
    note.top = Math.round(Math.random() * 500) + 'px';
    note.zIndex = ++highestInd;
    note.color = 'purple';
    note.setIdAttr(note.id);
    note.saveNew();
}

function Note() {
    let self = this;

    // NOTE
    let note = document.createElement('div');
    note.className = 'note';
    note.style.backgroundImage = 'url("img/purple.png")';
    note.addEventListener('mousedown', e => self.onNoteMouseDown(e), false);
    note.addEventListener('colorchange', e => console.log('yess'), false);
    //note.setAttribute(this.setAttribute())
    // CLOSE BTN
    let closeIcon = document.createElement('i');
    closeIcon.className = 'far fa-times-circle';

    let close = document.createElement('div');
    close.className = 'close';
    close.appendChild(closeIcon);
    close.addEventListener('click', () => self.onCloseBtnClick(), false);

    // Note color options
    let select = document.createElement('select');
    select.className = 'color';
    select.addEventListener('change', () => self.onColorBtnClick(), false);

    for(let i = 0; i < DEFAUL_COLORS.length; i++){
    	let option = createOption(DEFAUL_COLORS[i]);
    	select.appendChild(option);
    }
    // EDIT
    let edit = document.createElement('div');
    edit.className = 'edit';
    edit.setAttribute('contenteditable', true);
    edit.addEventListener('click', () => self.onNoteClick(), false);
    edit.addEventListener('keyup', e => self.onEditKeyUp(e), false);


    // TIMESTAMP
    let ts = document.createElement('div');
    ts.className = 'timestamp';

    this.note = note;
    this.edit = edit;
    this.select = select;
    this.lastModifiedAt = ts;

    note.appendChild(edit);
    note.appendChild(close);
    note.appendChild(select);
    note.appendChild(ts);
    document.body.appendChild(note);

    return this;
}

Note.prototype = {
    get id() {
        if (!"_id" in this) this._id = 0;
        return this._id
    },
    set id(id) {
        this._id = id;
    },
    set color(color) {
        this._color = color;
    },
    get color() {
        this._color;
    },
    set text(text) {
        this._text = text;
    },
    get text() {
        return this._text = this.edit.innerHTML || this._text;
    },
    set timestamp(ts) {
        this._timestamp = ts;
        let date = new Date();
        date.setTime(parseFloat(ts));
        this.lastModifiedAt.textContent = modifyDate(date);
    },
    get timestamp() {
        if (!"_timestamp" in this) this._timestamp = 0;
        return this._timestamp;
    },
    set left(x) {
        this.note.style.left = x;
    },
    get left() {
        return this.note.style.left;
    },
    set top(y) {
        this.note.style.top = y;
    },
    get top() {
        return this.note.style.top;
    },
    set zIndex(z) {
        this.note.style.zIndex = z;
    },
    get zIndex() {
        return this.note.style.zIndex;
    },
    saveNew: function() {
        let note = this;
        DB.transaction(tx => tx.executeSql("INSERT INTO MyStikies (id, note, left, top, timestamp, color, zIndex) VALUES (?, ?, ?, ?, ?, ?, ?)", [note.id, note.text || "", note.left, note.top, note.timestamp, note._color, note.zIndex]));
    },
    onCloseBtnClick: function(e) {
        this.cancelPendingSave();
        let note = this;

        DB.transaction(
            tx => tx.executeSql("DELETE FROM MyStikies WHERE id = ?", [note.id]),
            err => console.log('Error:', err)
        );

        document.body.removeChild(this.note);
    },
    cancelPendingSave: function() {
        if (!("_pendingSave" in this)) return;

        clearTimeout(this._pendingSave);
        delete this._pendingSave;
    },
    scheduleSave: function() {
        this.cancelPendingSave();
        let self = this;
        this._pendingSave = setTimeout(() => self.updateNote(), 200);
    },
    onNoteMouseDown: function(e) {
        captured = this;
        this.startX = e.clientX - this.note.offsetLeft;
        this.startY = e.clientY - this.note.offsetTop;
        this.zIndex = ++highestInd;

        let self = this;
        if (!("mouseMoveHandler" in this)) {
            this.mouseMoveHandler = function(e) {
                return self.onMouseMove(e);
            }
            this.mouseUpHandler = function(e) {
                return self.onMouseUp(e);
            }
        }

        document.addEventListener('mousemove', this.mouseMoveHandler, true);
        document.addEventListener('mouseup', this.mouseUpHandler, true);
        return false;
    },
    onMouseMove: function(e) {
        if (this != captured) return true;

        this.left = e.clientX - this.startX + 'px';
        this.top = e.clientY - this.startY + 'px';
        return false;
    },
    onMouseUp: function(e) {
        document.removeEventListener('mousemove', this.mouseMoveHandler, true);
        document.removeEventListener('mouseup', this.mouseUpHandler, true);

        this.updateNote();
        return false;
    },
    updateNote: function() {
        this.cancelPendingSave();

        if ("dirty" in this) {
            this.timestamp = new Date().getTime();
            delete this.dirty;
        }
        this.text = this.edit.innerHTML;
        let note = this;
        DB.transaction(tx => tx.executeSql("UPDATE MyStikies SET note = ?, timestamp = ?, left = ?, top = ?, color = ?, zindex = ? WHERE id = ?", [note.text, note.timestamp, note.left, note.top, note._color, note.zIndex, note.id]));
    },
    onNoteClick: function() {
        this.edit.focus();
        getSelection().collapseToEnd();
    },
    onEditKeyUp: function() {
        this.dirty = true;
        this.scheduleSave();
    },
    onColorBtnClick: function() {
        let color = this.select.options[this.select.selectedIndex].value;
        let note = this;
        note.color = color;
        DB.transaction(tx => tx.executeSql("UPDATE MyStikies SET note = ?, timestamp = ?, left = ?, top = ?, color = ?, zindex = ? WHERE id = ?", [note.text, note.timestamp, note.left, note.top, note._color, note.zIndex, note.id]));

        let noteElem = document.getElementById('note_' + this.id);
        if (noteElem) noteElem.style.backgroundImage = 'url("img/' + color + '.png")';
    },
    setIdAttr: function(value) {
        this.note.id = "note_" + value;
    }
};
// DB.transaction(tx => tx.executeSql("DROP TABLE MyStikies", []));

function onLoad() {
    DB.transaction(
        tx => tx.executeSql(
            // Get every data from
            "SELECT COUNT(*) FROM MyStikies", [],
            stikies => loadNotes(),
            // If error, create new table
            (tx, error) => tx.executeSql(
                "CREATE TABLE MyStikies (id REAL UNIQUE, note TEXT, left TEXT, top TEXT, timestamp TEXT, color TEXT, zIndex REAL)", [],
                () => loadNotes()
            )
        )
    )
};

function loadNotes() {
    DB.transaction(tx =>
        tx.executeSql("SELECT id, note, left, top, timestamp, zIndex, color FROM MyStikies", [],
            // Show all existing notes
            (tx, result) => {
                for (let i = 0; i < result.rows.length; ++i) {
                    let row = result.rows[i];
                    let note = new Note();
                    let color = row['color'];
                    note.id = row['id'];
                    note.left = row['left'];
                    note.top = row['top'];
                    note.timestamp = row['timestamp'];
                    note.zIndex = row['zIndex'];
                    note.color = color;
                    note.edit.innerHTML = note.text = row['note'];
                    note.note.style.backgroundImage = 'url("img/' + color + '.png")';

                    note.setIdAttr(note.id);
                    note.select.innerHTML = '';

                    // Sort options based on color used
                    for (var ind = 0; ind < DEFAUL_COLORS.length; ind++) {
				        let option = createOption(DEFAUL_COLORS[ind]);
				        if(DEFAUL_COLORS[ind] == color){
				        	option.setAttribute('selected', 'selected');
				        	note.select.prepend(option);
				        }else{
				        	note.select.appendChild(option);
				        }
				    }

                    if (row['id'] > highestID) highestID = row['id'];
                    if (row['zIndex'] > highestInd) highestInd = row['zIndex'];
                }
            },
            // If error, alert message
            (tx, error) => alert('Failed to retrieve notes. Error: ' + error)
        )
    )
};

function createOption(val) {
    let option = document.createElement('option');
    option.setAttribute('value', val);
    option.innerHTML = val.capitalize();
    return option;
}

function modifyDate(date) {
    let time = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        mins: date.getMinutes()
    };
    for (let k in time) {
        if (time[k].toString().length == 1) time[k] = "0" + time[k];
    }
    return "Last Modified At: " + time.year + '/' + time.month + '/' + time.day + ' ' + time.hour + ':' + time.mins;
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

if (DB !== null) addEventListener('load', onLoad, false);