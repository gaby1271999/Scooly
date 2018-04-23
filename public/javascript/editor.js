function generateEditor(element, displayId, contentId, name) {
    var divEditorElement = document.createElement('div');

    divEditorElement.setAttribute('style', 'height: 15%; background-color: #00A65A; vertical-align: middle; margin-top: 1%;');
    divEditorElement.innerHTML = '<select style="margin-left: 3%; background-color: #00A65A; outline: 0; border: 0;" onchange="changeFont(this[this.selectedIndex].value)">\n' +
        '        <option value="Andale Mono" style="font-family: Andale Mono;">Andale Mono</option>\n' +
        '        <option value="Arial" style="font-family: Arial;">Arial</option>\n' +
        '        <option value="Arial Black" style="font-family: Arial Black;">Arial Black</option>\n' +
        '        <option value="Book Antiqua" style="font-family: Book Antiqua;">Book Antiqua</option>\n' +
        '        <option value="Comic Sans MS" style="font-family: Comic Sans MS;">Comic Sans MS</option>\n' +
        '        <option value="Courier New" style="font-family: Courier New;">Courier New</option>\n' +
        '        <option value="Georgia" style="font-family: Georgia;">Georgia</option>\n' +
        '        <option value="Helvetica" style="font-family: Helvetica;">Helvetica</option>\n' +
        '        <option value="Impact" style="font-family: Impact;">Impact</option>\n' +
        '        <option value="Open Sans" style="font-family: Open Sans;">Open Sans</option>\n' +
        '        <option value="Tahoma" style="font-family: Tahoma;">Tahoma</option>\n' +
        '        <option value="Terminal" style="font-family: Terminal;">Terminal</option>\n' +
        '        <option value="Times New Roman" style="font-family: Times New Roman;">Times New Roman</option>\n' +
        '        <option value="Trebuchet MS" style="font-family: Trebuchet MS;">Trebuchet MS</option>\n' +
        '        <option value="Verdana" style="font-family: Verdana;">Verdana</option>\n' +
        '        <option value="Webdings" style="font-family: Webdings;">Webdings</option>\n' +
        '        <option value="Wingdings" style="font-family: Wingdings;">Wingdings</option>\n' +
        '    </select>\n' +
        '\n' +
        '    <select style="margin-left: 3%; background-color: #00A65A; outline: 0; border: 0;" onchange="changeSize(this[this.selectedIndex].value)">\n' +
        '        <option value="1">Very small</option>\n' +
        '        <option value="2">small</option>\n' +
        '        <option value="3">Normal</option>\n' +
        '        <option value="4">Medium-large</option>\n' +
        '        <option value="5">Big</option>\n' +
        '        <option value="6">Very big</option>\n' +
        '        <option value="7">Maximum</option>\n' +
        '    </select>\n' +
        '    <input type="button" value="B" onclick="bold()" style="outline: 0; border: 0; background-color: #00A65A; margin-left: 3%;">\n' +
        '    <input type="button" value="I" onclick="italic()" style="outline: 0; border: 0; background-color: #00A65A; margin-left: 3%;">\n' +
        '    <input type="button" value="U" onclick="underlined()" style="outline: 0; border: 0; background-color: #00A65A; margin-left: 3%;">'

    element.parentNode.insertBefore(divEditorElement, element);


    var divTextDisplayElement = document.createElement('div');

    divTextDisplayElement.setAttribute('id', displayId);
    divTextDisplayElement.setAttribute('class', 'scroll');
    divTextDisplayElement.setAttribute('contenteditable', 'true');
    divTextDisplayElement.setAttribute('spellcheck', 'true');
    divTextDisplayElement.setAttribute('style', 'height: 250px; overflow-y: scroll; outline: none; padding: 1%; border: 1px solid black;');

    element.parentNode.insertBefore(divTextDisplayElement, element);


    var textareaElement = document.createElement('textarea');

    textareaElement.setAttribute('name', name);
    textareaElement.setAttribute('id', contentId);
    textareaElement.setAttribute('style', 'display: none;');

    element.parentNode.insertBefore(textareaElement, element);
}