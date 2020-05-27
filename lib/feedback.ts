import * as html2canvas from 'html2canvas';

export interface FeedbackOptions {
  classes?: { [key: string]: string; };
  backgroundOpacity?: number;
  allowedTags?: string[];
  endpoint: string;
  texts?: { [key: string]: string; };
}

export interface HTML2CanvasOptions {
  async?: boolean;
  allowTaint?: boolean;
  backgroundColor?: string;
  canvas?: HTMLCanvasElement;
  foreignObjectRendering?: boolean;
  imageTimeout?: number;
  logging?: boolean;
  proxy?: string;
  removeContainer?: boolean;
  scale?: number;
  useCORS?: boolean;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  scrollX?: number;
  scrollY?: number;
  windowWidth?: number;
  windowHeight?: number;
}

interface State {
  isOpen: boolean;
  isDragging: boolean;
  dragged: boolean;
  canDraw: boolean;
  includeScreenshot: boolean;
  highlight: boolean;
  isDrawing: boolean;
  sending: boolean;
}

interface Position {
  startX: number;
  startY: number;
  currTransform: string;
  nextTransform: string;
  limits: {
    xNeg: number;
    xPos: number;
    yNeg: number;
    yPos: number;
  };
}

interface Area {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

interface Helper extends Area {
  highlight: boolean;
  index: number;
}

export class Feedback {
  private _options: FeedbackOptions = {
    backgroundOpacity: .5,
    allowedTags: [
      'button', 'a', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'p',
      'i', 'strong', 'small', 'sub', 'sup', 'b', 'time', 'img',
      'caption', 'input', 'label', 'legend', 'select', 'textarea',
      'details', 'summary'
    ],
    endpoint: 'https://you-endpoint.com/',
    classes: {
      prefix: 'fb-',
      button: 'mat-button',
      buttonPrimary: 'primary',
      buttonDefault: 'btn',
    },
    texts: {
      describe: '描述你的问题，分享你的想法...',
      title: '意见反馈',
      screenshot: '包含屏幕截图',
      cancel: '取消',
      send: '发送',
      sending: '发送中...',
      sent: '已发送...',
      error: '失败...',
      back: '返回',
      close: '关闭',
      ok: '好的',
      dragger: '拖动',
      highlight: '高亮显示',
      blackout: '打码',
      done: '完成',
      remove: '移除',
      footnote:"您的意见是我们不断改进的动力，欢迎您反馈使用过程中遇到的问题或为我们提出宝贵意见。可留下联系信息，以便我们与您取得联系。",
    }
  };

  private _html2canvasOptions: HTML2CanvasOptions = {
    allowTaint: true
  };

  private _initState: State = {
    isOpen: false,
    isDragging: false,
    dragged: false,
    canDraw: false,
    includeScreenshot: true,
    highlight: true,
    isDrawing: false,
    sending: false
  };

  private _initArea: Area = {
    startX: 0,
    startY: 0,
    width: 0,
    height: 0
  };

  private _state: State = { ...this._initState };
  private _root: HTMLDivElement;
  private _formContainer: HTMLDivElement;
  private _form: HTMLFormElement;
  private _checkbox: HTMLInputElement;
  private _checkboxSvg: SVGSVGElement;
  private _checkboxSvgPath: SVGPathElement;
  private _screenshotContainer: HTMLDivElement;
  private _screenshotCanvas: HTMLCanvasElement;
  private _footnoteContainer: HTMLElement;
  private _sendingContainer: HTMLDivElement;
  private _sentContainer: HTMLDivElement;
  private _errorContainer: HTMLDivElement;
  private _drawOptions: HTMLDivElement;
  private _dragger: HTMLDivElement;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _area: Area = { ...this._initArea };
  private _highlightedArea: Area;
  private _helpersContainer: HTMLDivElement;
  private _helperElements: HTMLDivElement[] = [];
  private _helpers: Helper[] = [];
  private _helperIdx = 0;

  private _drawOptionsPos: Position = {
    startX: 0,
    startY: 0,
    currTransform: null,
    nextTransform: null,
    limits: {
      xNeg: 0,
      xPos: 0,
      yNeg: 0,
      yPos: 0
    }
  };

  private _checkedColor = '#4285F4';
  private _uncheckedColor = '#757575';
  private _checkedPath = `M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-`
    + `1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z`;
  private _uncheckedPath = `M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z`;

  constructor(options?: FeedbackOptions, html2canvasOptions?: HTML2CanvasOptions) {
    if (options) {
      this._options = {
        ...this._options,
        ...options
      };
    }

    if (html2canvasOptions) {
      this._html2canvasOptions = {
        ...this._html2canvasOptions,
        ...html2canvasOptions
      };
    }
  }

  open() {
    if (!this._state.isOpen) {
      this._state.isOpen = true;
      this._root = this._createModal();
      document.body.appendChild(this._root);

      this._onScroll();

      document.addEventListener('keydown', this._closeListener);
      window.addEventListener('scroll', this._onScroll);

      if (this._state.includeScreenshot) {
        this._genScreenshot();
      }
    }
  }

  close = () => {
    document.removeEventListener('mousemove', this._dragDrag);
    document.removeEventListener('mouseup', this._dragStop);
    document.removeEventListener('mouseup', this._drawStop);
    document.removeEventListener('mousemove', this._drawDraw);
    document.removeEventListener('keydown', this._closeListener);
    document.removeEventListener('mousemove', this._highlightElement);
    document.removeEventListener('click', this._addHighlightedElement);
    window.removeEventListener('resize', this._resize);
    // TODO: Should we remove the inner listeners on close?
    // https://stackoverflow.com/a/37096563/1994803
    document.body.removeChild(this._root);
    this._reset();
  }

  private _reset() {
    this._state = { ...this._initState };
    this._helpers = [];
    this._helperElements = [];
    this._helperIdx = 0;
  }

  private _createModal(): HTMLDivElement {
    const root = document.createElement('div');
    root.id = 'feedback-js';

    root.appendChild(this._createForm());
    root.appendChild(this._createHelpersContainer());
    root.appendChild(this._createCanvas());

    return root;
  }

  private _send() {
    this._state.sending = true;

    this._showSending();

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const data = {
      message: this._form[0].value,
      screenshot: document.querySelector('#screenshot').checked?this._screenshotCanvas.toDataURL():"",
    };

    fetch(this._options.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(resp => {
        if (resp.ok) {
          this._state.sending = false;
          this._showSent();
        } else {
          throw new Error(`failed to post data to ${this._options.endpoint}`);
        }
      })
      .catch(_ => {
        this._state.sending = false;
        this._showError();
      });
  }

  private _closeListener = ($event: KeyboardEvent) => {
    if ($event.key === 'Escape') {
      this.close();
    }
  }

  private _toggleScreenshot = ($event: MouseEvent) => {
    $event.preventDefault();
    this._state.includeScreenshot = !this._state.includeScreenshot;
    this._checkbox.checked = this._state.includeScreenshot;
    this._checkboxSvg.setAttributeNS(null, 'fill', this._state.includeScreenshot ? this._checkedColor : this._uncheckedColor);
    this._checkboxSvgPath.setAttributeNS(null, 'd', this._state.includeScreenshot ? this._checkedPath : this._uncheckedPath);

    if (!this._state.includeScreenshot) {
      this._form.removeChild(this._screenshotContainer);
    } else {
      this._form.insertBefore(this._createScreenshotContainer(), this._footnoteContainer);
      this._genScreenshot();
    }
  }

  private _genScreenshot() {
    this._html2canvasOptions = {
      ...this._html2canvasOptions,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.pageXOffset,
      scrollY: window.pageYOffset,
      x: window.pageXOffset,
      y: window.pageYOffset
    };

    while (this._screenshotContainer.firstChild) {
      this._screenshotContainer.removeChild(this._screenshotContainer.firstChild);
    }

    this._redraw(false);
    html2canvas(document.body, this._html2canvasOptions).then((canvas: HTMLCanvasElement) => {
      this._screenshotCanvas = canvas;
      this._screenshotContainer.appendChild(canvas);
      this._redraw();
    });
  }

  private _openDrawer = () => {
    this._state.canDraw = true;
    this._canvas.classList.add('active');
    this._formContainer.style.display = 'none';
    this._root.appendChild(this._createDrawOptions());
    document.addEventListener('mousemove', this._highlightElement);
    document.addEventListener('click', this._addHighlightedElement);
  }

  private _closeDrawer = () => {
    this._state.canDraw = false;
    this._canvas.classList.remove('active');
    this._root.removeChild(this._drawOptions);
    this._formContainer.style.display = 'block';
    document.removeEventListener('mousemove', this._highlightElement);
    document.removeEventListener('click', this._addHighlightedElement);
    this._genScreenshot();
  }

  private _createHeader(): HTMLDivElement {
    let header = document.createElement('div');
    header.className = `${this._options.classes.prefix}header`;

    let headerH1 = document.createElement('h1');
    headerH1.innerText = this._options.texts.title;
    header.appendChild(headerH1);
    return header;
  }

  private _createForm(): HTMLDivElement {
    let container = document.createElement('div');
    container.className = `${this._options.classes.prefix}form-container`;
    container.setAttribute('data-html2canvas-ignore', 'true');
    this._formContainer = container;

    let form = document.createElement('form');
    form.appendChild(this._createHeader());
    form.appendChild(this._createTextarea());
    form.appendChild(this._createCheckboxContainer());

    if (this._state.includeScreenshot) {
      form.appendChild(this._createScreenshotContainer());
    }

    form.appendChild(this._createFootnote());
    form.appendChild(this._createActionsContainer());
    this._form = form;
    container.appendChild(form);
    return container;
  }

  private _createCanvas(): HTMLCanvasElement {
    let canvas = document.createElement('canvas');
    canvas.width = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
    canvas.className = 'draw-area';
    canvas.addEventListener('mousedown', this._drawStart);
    document.addEventListener('mouseup', this._drawStop);
    document.addEventListener('mousemove', this._drawDraw);
    window.addEventListener('resize', this._resize);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resetCanvas();
    return canvas;
  }

  private _resize = () => {
    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;
    this._canvas.width = width;
    this._canvas.height = height;
    this._helpersContainer.style.width = `${width}px`;
    this._helpersContainer.style.height = `${height}px`;
    this._redraw();
  }

  private _createTextarea(): HTMLTextAreaElement {
    let textarea = document.createElement('textarea');
    textarea.placeholder = this._options.texts.describe;
    return textarea;
  }

  private _createCheckboxContainer(): HTMLDivElement {
    let checkboxContainer = document.createElement('div');
    checkboxContainer.className = `${this._options.classes.prefix}checkbox`;

    let checkboxLabel = document.createElement('label');
    checkboxLabel.addEventListener('click', this._toggleScreenshot);
    checkboxLabel.htmlFor = 'screenshot';

    let checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'screenshot';
    checkbox.checked = this._state.includeScreenshot;
    this._checkbox = checkbox;
    checkboxLabel.appendChild(checkbox);

    let checkboxSvgContainer = document.createElement('div');
    let checkboxSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkboxSvg.setAttributeNS(null, 'fill', this._state.includeScreenshot ? this._checkedColor : this._uncheckedColor);
    checkboxSvg.setAttributeNS(null, 'width', '24px');
    checkboxSvg.setAttributeNS(null, 'height', '24px');
    checkboxSvg.setAttributeNS(null, 'viewBox', '0 0 24 24');
    this._checkboxSvg = checkboxSvg;

    let checkboxSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkboxSvgPath.setAttributeNS(null, 'd', this._state.includeScreenshot ? this._checkedPath : this._uncheckedPath);
    this._checkboxSvgPath = checkboxSvgPath;

    checkboxSvg.appendChild(checkboxSvgPath);
    checkboxSvgContainer.appendChild(checkboxSvg);
    checkboxLabel.appendChild(checkboxSvgContainer);

    let checkboxLabelSpan = document.createElement('span');
    checkboxLabelSpan.innerText = this._options.texts.screenshot;
    checkboxLabel.appendChild(checkboxLabelSpan);

    checkboxContainer.appendChild(checkboxLabel);
    return checkboxContainer;
  }

  private _createScreenshotContainer(): HTMLDivElement {
    let screenshotContainer = document.createElement('div');
    screenshotContainer.className = `${this._options.classes.prefix}screenshot`;
    screenshotContainer.addEventListener('click', this._openDrawer);
    this._screenshotContainer = screenshotContainer;
    return screenshotContainer;
  }

  private _createFootnote(): HTMLElement {
    let footnote = document.createElement('small');
    footnote.innerText = this._options.texts.footnote;
    this._footnoteContainer = footnote;
    return footnote;
  }

  private _createActionsContainer(): HTMLDivElement {
    let actions = document.createElement('div');
    actions.className = `${this._options.classes.prefix}actions`;

    let sendButtonContainer = document.createElement('div');
    sendButtonContainer.classList.add(this._options.classes.button);
    sendButtonContainer.classList.add(this._options.classes.buttonPrimary);

    let sendButton = document.createElement('button');
    sendButton.innerText = this._options.texts.send;
    sendButton.type = 'submit';
    sendButton.addEventListener('click', ($event) => {
      $event.preventDefault();
      this._send();
    });
    sendButtonContainer.appendChild(sendButton);
    actions.appendChild(sendButtonContainer);

    let cancelButtonContainer = document.createElement('div');
    cancelButtonContainer.classList.add(this._options.classes.button);

    let cancelButton = document.createElement('button');
    cancelButton.innerText = this._options.texts.cancel;
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', this.close);
    cancelButtonContainer.appendChild(cancelButton);
    actions.appendChild(cancelButtonContainer);
    return actions;
  }

  private _createDrawOptions(): HTMLDivElement {
    let drawOptions = document.createElement('div');
    drawOptions.className = `${this._options.classes.prefix}draw-options`;

    let draggerContainer = document.createElement('div');
    draggerContainer.className = 'dragger';
    draggerContainer.innerText = this._options.texts.dragger;

    draggerContainer.addEventListener('mousedown', this._dragStart);
    document.addEventListener('mousemove', this._dragDrag);
    document.addEventListener('mouseup', this._dragStop);

    this._dragger = draggerContainer;
    drawOptions.appendChild(draggerContainer);

    let highlightButtonContainer = document.createElement('div');
    let highlightButton = document.createElement('button');
    highlightButton.innerText = this._options.texts.highlight;
    highlightButton.type = 'button';
    highlightButton.classList.add(this._options.classes.button)
    highlightButton.classList.add(this._options.classes.buttonDefault)
    highlightButton.addEventListener('click', () => this._state.highlight = true);
    highlightButtonContainer.appendChild(highlightButton);
    drawOptions.appendChild(highlightButtonContainer);

    let blackoutButtonContainer = document.createElement('div');
    let blackoutButton = document.createElement('button');
    blackoutButton.innerText = this._options.texts.blackout;
    blackoutButton.type = 'button';
    blackoutButton.classList.add(this._options.classes.button)
    blackoutButton.classList.add(this._options.classes.buttonDefault)
    blackoutButton.addEventListener('click', () => this._state.highlight = false);
    blackoutButtonContainer.appendChild(blackoutButton);
    drawOptions.appendChild(blackoutButtonContainer);

    let doneButtonContainer = document.createElement('div');

    let doneButton = document.createElement('button');
    doneButton.innerText = this._options.texts.done;
    doneButton.type = 'button';
    doneButton.classList.add(this._options.classes.button)
    doneButton.classList.add(this._options.classes.buttonDefault)
    doneButton.addEventListener('click', this._closeDrawer);
    doneButtonContainer.appendChild(doneButton);
    drawOptions.appendChild(doneButtonContainer);

    this._drawOptions = drawOptions;
    this._drawOptionsPos.currTransform = 'translate(-50%, -50%)';
    return drawOptions;
  }

  private _createHelpersContainer(): HTMLDivElement {
    let helpersContainer = document.createElement('div');
    helpersContainer.className = 'helpers';
    helpersContainer.style.width = `${document.documentElement.scrollWidth}px`;
    helpersContainer.style.height = `${document.documentElement.scrollHeight}px`;
    this._helpersContainer = helpersContainer;
    return helpersContainer;
  }

  private _dragStart = ($event: MouseEvent) => {
    if (!this._state.isDragging) {
      this._state.isDragging = true;
      this._drawOptionsPos.startX = $event.clientX;
      this._drawOptionsPos.startY = $event.clientY;

      const rect = this._drawOptions.getBoundingClientRect();
      this._drawOptionsPos.limits.xNeg = -rect.left;
      this._drawOptionsPos.limits.xPos = document.documentElement.clientWidth - rect.right;
      this._drawOptionsPos.limits.yNeg = -rect.top;
      this._drawOptionsPos.limits.yPos = document.documentElement.clientHeight - rect.bottom;
    }
  }

  private _dragDrag = ($event: MouseEvent) => {
    if (this._state.isDragging) {
      $event.preventDefault();

      let nextX = $event.clientX - this._drawOptionsPos.startX;
      let nextY = $event.clientY - this._drawOptionsPos.startY;

      if (nextX < this._drawOptionsPos.limits.xNeg) {
        nextX = this._drawOptionsPos.limits.xNeg;
      }

      if (nextX > this._drawOptionsPos.limits.xPos) {
        nextX = this._drawOptionsPos.limits.xPos;
      }

      if (nextY < this._drawOptionsPos.limits.yNeg) {
        nextY = this._drawOptionsPos.limits.yNeg;
      }

      if (nextY > this._drawOptionsPos.limits.yPos) {
        nextY = this._drawOptionsPos.limits.yPos;
      }

      nextX = Math.round(nextX);
      nextY = Math.round(nextY);

      this._drawOptionsPos.nextTransform = `translate(${nextX}px, ${nextY}px)`;
      this._drawOptions.style.transform = `${this._drawOptionsPos.currTransform} ${this._drawOptionsPos.nextTransform}`;
      this._state.dragged = true;
    }
  }

  private _dragStop = ($event: MouseEvent) => {
    this._state.isDragging = false;
    if (this._state.dragged) {
      this._drawOptionsPos.currTransform = `${this._drawOptionsPos.currTransform} ${this._drawOptionsPos.nextTransform}`;
      this._state.dragged = false;
    }
  }

  private _drawStart = ($event: MouseEvent) => {
    if (this._state.canDraw) {
      this._state.isDrawing = true;
      this._area = {
        startX: $event.clientX + document.documentElement.scrollLeft,
        startY: $event.clientY + document.documentElement.scrollTop,
        width: 0,
        height: 0
      };
    }
  }

  private _drawStop = ($event: MouseEvent) => {
    if (this._state.canDraw) {
      this._state.isDrawing = false;

      if (Math.abs(this._area.width) < 6 || Math.abs(this._area.height) < 6) {
        return;
      }

      let helper: Helper = { ...this._area, highlight: this._state.highlight, index: this._helperIdx++ };

      if (helper.width < 0) {
        helper.startX += helper.width;
        helper.width *= -1;
      }

      if (helper.height < 0) {
        helper.startY += helper.height;
        helper.height *= -1;
      }

      this._area = { ...this._initArea };
      this._helperElements.push(this._createHelper(helper));
      this._helpers.push(helper);
      this._redraw();
    }
  }

  private _drawDraw = ($event: MouseEvent) => {
    $event.preventDefault();

    if (this._state.isDrawing) {
      this._area.width = $event.clientX - this._area.startX + document.documentElement.scrollLeft;
      this._area.height = $event.clientY - this._area.startY + document.documentElement.scrollTop;

      // TODO: constant '4' should be lineWidth - also should be optional
      if (this._area.startX + this._area.width > document.documentElement.scrollWidth) {
        this._area.width = document.documentElement.scrollWidth - this._area.startX - 4;
      }

      if (this._area.startX + this._area.width < 0) {
        this._area.width = -this._area.startX + 4;
      }

      if (this._area.startY + this._area.height > document.documentElement.scrollHeight) {
        this._area.height = document.documentElement.scrollHeight - this._area.startY - 4;
      }

      if (this._area.startY + this._area.height < 0) {
        this._area.height = -this._area.startY + 4;
      }

      this._resetCanvas();
      this._drawHighlightLines();

      if (this._state.highlight && Math.abs(this._area.width) > 6 && Math.abs(this._area.height) > 6) {
        this._drawLines(this._area.startX, this._area.startY, this._area.width, this._area.height);
        this._ctx.clearRect(this._area.startX, this._area.startY, this._area.width, this._area.height);
      }

      this._paintArea();
      this._paintArea(false);

      if (!this._state.highlight && Math.abs(this._area.width) > 6 && Math.abs(this._area.height) > 6) {
        this._ctx.fillStyle = 'rgba(0,0,0,.5)';
        this._ctx.fillRect(this._area.startX, this._area.startY, this._area.width, this._area.height);
      }
    }
  }

  private _resetCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.fillStyle = 'rgba(102,102,102,.5)';
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  }

  private _drawHighlightLines() {
    this._helpers.filter(helper => helper.highlight).forEach(
      helper => {
        this._drawLines(helper.startX, helper.startY, helper.width, helper.height);
      }
    );
  }

  private _paintArea(highlight: boolean = true) {
    if (highlight) {
      this._helpers.filter(helper => helper.highlight).forEach(
        helper => {
          this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
        }
      );
    } else {
      this._helpers.filter(helper => !helper.highlight).forEach(
        helper => {
          this._ctx.fillStyle = 'rgba(0,0,0,1)';
          this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);
        }
      );
    }
  }

  private _redraw(withBorder: boolean = true) {
    this._resetCanvas();
    if (withBorder) {
      this._drawHighlightLines();
    }
    this._paintArea();
    this._paintArea(false);
  }

  private _drawLines(x: number, y: number, width: number, height: number) {
    this._ctx.strokeStyle = '#ffeb3b';
    this._ctx.lineJoin = 'bevel';
    this._ctx.lineWidth = 4;

    this._ctx.strokeRect(x, y, width, height);

    this._ctx.lineWidth = 1;
  }

  private _createHelper(helper: Helper): HTMLDivElement {
    let h = document.createElement('div');
    h.className = helper.highlight ? 'highlight' : 'blackout';
    h.style.position = 'absolute';
    h.style.top = `${helper.startY}px`;
    h.style.left = `${helper.startX}px`;
    h.style.height = `${helper.height}px`;
    h.style.width = `${helper.width}px`;
    h.style.zIndex = '20';
    h.setAttribute('idx', `${helper.index}`);

    let inner = document.createElement('div');
    inner.style.width = `${helper.width - 2}px`;
    inner.style.height = `${helper.height - 2}px`;
    inner.style.margin = '1px';

    let removeButton = document.createElement('button');
    removeButton.innerText = this._options.texts.remove;
    removeButton.style.position = 'absolute';
    removeButton.style.right = '0';
    removeButton.style.top = '0';
    removeButton.addEventListener('click', ($event) => {
      removeButton.parentNode.parentNode.removeChild(h);
      this._helpers.splice(this._helpers.findIndex(_helper => _helper.index === helper.index), 1);
      this._helperElements.splice(this._helperElements.findIndex(_helper => +_helper.getAttribute('idx') === helper.index), 1);
      this._redraw();
    });

    h.addEventListener('mouseenter', ($event) => {
      if (this._state.canDraw && !this._state.isDrawing) {
        h.appendChild(inner);
        h.appendChild(removeButton);

        if (!helper.highlight) {
          this._resetCanvas();

          this._drawHighlightLines();
          this._paintArea();

          this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
          this._ctx.fillStyle = 'rgba(0,0,0,.75)';
          this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);

          this._helpers.filter(_helper => !_helper.highlight && _helper.index !== helper.index).forEach(
            _helper => {
              this._ctx.fillStyle = 'rgba(0,0,0,1)';
              this._ctx.fillRect(_helper.startX, _helper.startY, _helper.width, _helper.height);
            }
          );
        }
      }
    });

    h.addEventListener('mouseleave', ($event) => {
      if (this._state.canDraw && !this._state.isDrawing && h.hasChildNodes()) {
        h.removeChild(inner);
        h.removeChild(removeButton);
        if (!helper.highlight) {
          this._redraw();
        }
      }
    });

    this._helpersContainer.appendChild(h);
    return h;
  }

  private _highlightElement = ($event: MouseEvent) => {
    this._highlightedArea = null;

    // We need the 3rd element in the list.
    if (!this._state.canDraw || this._state.isDrawing) {
      return;
    }

    const el = document.elementsFromPoint($event.x, $event.y)[3];
    if (el) {
      if (this._options.allowedTags.indexOf(el.nodeName.toLowerCase()) === -1) {
        this._redraw();
        this._canvas.style.cursor = 'crosshair';
        return;
      }

      this._canvas.style.cursor = 'pointer';
      const rect = el.getBoundingClientRect();
      this._highlightedArea = {
        startX: rect.left + document.documentElement.scrollLeft,
        startY: rect.top + document.documentElement.scrollTop,
        width: rect.width,
        height: rect.height
      };

      this._redraw();

      if (this._state.highlight) {
        this._drawLines(
          this._highlightedArea.startX, this._highlightedArea.startY, this._highlightedArea.width, this._highlightedArea.height);
        this._ctx.clearRect(
          this._highlightedArea.startX, this._highlightedArea.startY, this._highlightedArea.width, this._highlightedArea.height);
      }

      this._paintArea();

      if (!this._state.highlight) {
        this._ctx.fillStyle = 'rgba(0,0,0,.5)';
        this._ctx.fillRect(
          this._highlightedArea.startX, this._highlightedArea.startY, this._highlightedArea.width, this._highlightedArea.height);
      }

      this._paintArea(false);
    }
  }

  private _addHighlightedElement = ($event: MouseEvent) => {
    if (this._highlightedArea) {
      if (Math.abs(this._highlightedArea.width) < 6 || Math.abs(this._highlightedArea.height) < 6) {
        return;
      }

      let helper: Helper = { ...this._highlightedArea, highlight: this._state.highlight, index: this._helperIdx++ };

      if (helper.width < 0) {
        helper.startX += helper.width;
        helper.width *= -1;
      }

      if (helper.height < 0) {
        helper.startY += helper.height;
        helper.height *= -1;
      }

      this._helperElements.push(this._createHelper(helper));
      this._helpers.push(helper);
    }
  }

  private _onScroll = () => {

    const x = -document.documentElement.scrollLeft;
    const y = -document.documentElement.scrollTop;
    this._canvas.style.left = `${x}px`;
    this._canvas.style.top = `${y}px`;
    this._helpersContainer.style.left = `${x}px`;
    this._helpersContainer.style.top = `${y}px`;
  }

  private _showSending() {
    let container = document.createElement('div');
    container.className = 'status';
    container.innerText = this._options.texts.sending;
    this._sendingContainer = container;
    this._formContainer.appendChild(container);
    this._form.style.display = 'none';
  }

  private _showSent() {
    this._formContainer.removeChild(this._sendingContainer);
    let container = document.createElement('div');
    container.className = 'status';
    container.innerText = this._options.texts.sent;

    let buttonContainer = document.createElement('div');
    buttonContainer.classList.add(this._options.classes.button);
    buttonContainer.classList.add(this._options.classes.buttonPrimary);

    let button = document.createElement('button');
    button.innerText = this._options.texts.ok;
    button.type = 'button';
    button.addEventListener('click', this.close);
    buttonContainer.appendChild(button);
    container.appendChild(buttonContainer);

    this._sentContainer = container;
    this._formContainer.appendChild(container);
  }

  private _showError() {
    this._formContainer.removeChild(this._sendingContainer);
    let container = document.createElement('div');
    container.className = 'status';
    container.innerText = this._options.texts.error;

    let actions = document.createElement('div');
    actions.className = 'actions';

    let backButtonContainer = document.createElement('div');
    backButtonContainer.classList.add(this._options.classes.button);
    backButtonContainer.classList.add(this._options.classes.buttonPrimary);

    let backButton = document.createElement('button');
    backButton.innerText = this._options.texts.back;
    backButton.type = 'button';
    backButton.addEventListener('click', () => {
      this._form.style.display = 'flex';
      this._formContainer.removeChild(this._errorContainer);
    });
    backButtonContainer.appendChild(backButton);
    actions.appendChild(backButtonContainer);

    let closeButtonContainer = document.createElement('div');
    closeButtonContainer.classList.add(this._options.classes.button);

    let closeButton = document.createElement('button');
    closeButton.innerText = this._options.texts.close;
    closeButton.type = 'button';
    closeButton.addEventListener('click', this.close);
    closeButtonContainer.appendChild(closeButton);
    actions.appendChild(closeButtonContainer);

    container.appendChild(actions);

    this._errorContainer = container;
    this._formContainer.appendChild(container);
  }
}
