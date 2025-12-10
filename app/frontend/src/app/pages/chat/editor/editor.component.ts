import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
// import { QuillModule,QuillEditorComponent  } from 'ngx-quill';
import Quill from 'quill';

@Component({
  selector: 'app-editor',
  styles: [`@import "https://cdnjs.cloudflare.com/ajax/libs/quill/2.0.2/quill.snow.css";`],
  imports: [
    // QuillModule,
    FormsModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent implements OnInit {
  @Input() message:any;
  @Output() onTyping_parent:EventEmitter<any>= new EventEmitter<any>();
  @Output() msgInputKeyup_parent:EventEmitter<any>= new EventEmitter<any>();
  @ViewChild('msginputField', { static: true }) editor!: ElementRef;  // Editor container reference
  // @ViewChild('msginputField') msginputField!: ElementRef;
  // @ViewChild('msginputField') editor!: QuillEditorComponent;
  showToolbar:boolean=true;
  quill:any;
  toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
    ['link', //'image', 'video', 'formula'
      ],
  
    // [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
    // [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    // [{ 'direction': 'rtl' }],                         // text direction
  
    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    // [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    // Removed color and background to ensure pasted/sent text remains theme-safe
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    // [{ 'font': [] }],
    [{ 'align': [] }],
  
    ['clean']                                         // remove formatting button
  ];

  constructor(private cdr: ChangeDetectorRef,private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.initQuill();
    setTimeout(() => {
      this.toggleEditorTool();
    }, 0);
  }

  async initQuill(){
    // Set up Quill options with syntax highlighting using highlight.js
    const option= {
      modules: {
        syntax: {
          highlight: (text: string) => (window as any).hljs.highlightAuto(text).value,
        },
        // syntax: true,  // Enable syntax module directly
        toolbar: this.toolbarOptions
      },
      placeholder: 'Type your message...',
      theme: 'snow'
    };
    this.quill = new Quill(this.editor.nativeElement,option);
    // Disable browser spellcheck on the editable area to avoid red squiggly underlines
    if (this.quill && this.quill.root) {
      this.quill.root.setAttribute('spellcheck', 'false');
    }
    this.message=this.quill.getContents();

    // Strip background and text color from pasted content
    this.quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node: any, delta: any) => {
      delta.ops.forEach((op: any) => {
        if (op.attributes) {
          delete op.attributes.background;
          delete op.attributes.color;
        }
      });
      return delta;
    });
    this.quill.root.addEventListener('paste', () => {
      setTimeout(() => {
        this.cdr.detectChanges();
      });
    });
  }
  

 
  focusOnEditor(){
    // this.msginputField.nativeElement.focus(); //focus on msg input
    this.quill.focus({ preventScroll: true });
  }
  setQuillEmpty(){
    this.quill.setContents([]);
  }
  onTyping(event: any){
    let text = this.quill.getText();
    let delta=this.quill.getContents();
      delta=JSON.stringify(delta);
    let justHtml = this.quill.root.innerHTML;
    // console.log(text);
    // console.log(delta);
    // console.log(justHtml);
    this.message=text;
    this.cdr.detectChanges();
    this.onTyping_parent.emit({event,msg:this.message,delta:delta,justHtml:justHtml,text:text});
  }
  toggleEditorTool(){
    const element = this.el.nativeElement.querySelector('.ql-toolbar.ql-snow');
    if (this.showToolbar) {
      if (element) {
        this.renderer.setStyle(element, 'display', 'none');
      }
    } else {
      if (element) {
        this.renderer.setStyle(element, 'display', 'block');
      }
    }
    this.showToolbar=!this.showToolbar ? true : false;
    // console.log(element);
  }

   msgInputKeyup(event: any){
    let text = this.quill.getText();
    let delta=this.quill.getContents();
      delta=JSON.stringify(delta);
    let justHtml = this.quill.root.innerHTML;
    // console.log(text);
    // console.log(delta);
    // console.log(justHtml);
    this.message=text;
    this.msgInputKeyup_parent.emit({event,msg:this.message,delta:delta,justHtml:justHtml,text:text});
  }

  insertEmoji(emoji:any){
    const range = this.quill.getSelection();
    if (range) {
      this.quill.insertText(range.index, emoji);
      this.quill.setSelection(range.index + emoji.length); // Move cursor after the emoji
    } else {
      this.quill.insertText(this.quill.getLength()-1, emoji);
      this.quill.setSelection(this.quill.getLength()); // Move cursor to the end
    }
  }
}
