import { inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { ChatService } from './chat.service';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';


const httpOptions = {
  headers: new HttpHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
  }),
  observe: 'response' as 'body',
  withCredentials: true
};
@Injectable({
  providedIn: 'root',
})
export class ColorSchemeService {
  private renderer: Renderer2;
  private colorScheme: string | undefined;// for color scheme like dark/ light
  private themeColor: string='green'; // for theme color : red green blue
  // Define prefix for clearer and more readable class names in scss files
  private colorSchemePrefix = 'color-scheme-'; //defauld prefix for all theme
  private chatService = inject(ChatService);
  serverPath: string;
  themeImage: any="pattern-05.png";

  constructor(rendererFactory: RendererFactory2,private http:HttpClient) {
    // Create new renderer from renderFactory, to make it possible to use renderer2 in a service
    this.renderer = rendererFactory.createRenderer(null, null);
    this.serverPath=environment.apiUrl;
  }

  _detectPrefersColorScheme() {
    // Detect if prefers-color-scheme is supported
    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
      // Set colorScheme to Dark if prefers-color-scheme is dark. Otherwise, set it to Light.
      this.colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
    } else {
      // If the browser does not support prefers-color-scheme, set the default to dark.
      this.colorScheme = 'dark';
    }
  }

  _setColorScheme(scheme: string) {
    this.colorScheme = scheme;
    // Save prefers-color-scheme to localStorage
    localStorage.setItem('prefers-color', scheme);
  }

  _getColorScheme() {
    const localStorageColorScheme = localStorage.getItem('prefers-color');
    // Check if any prefers-color-scheme is stored in localStorage
    if (localStorageColorScheme) {
      // Save prefers-color-scheme from localStorage
      this.colorScheme = localStorageColorScheme;
    } else {
      // If no prefers-color-scheme is stored in localStorage, try to detect OS default prefers-color-scheme
      this._detectPrefersColorScheme();
    }
  }

  // get theme color
  _getThemeColor(){
    const localStorageThemeColor = localStorage.getItem('theme-color');
    // alert(localStorageThemeColor);
    if(localStorageThemeColor && localStorageThemeColor!=''){
      this.themeColor = localStorageThemeColor;
    }else{
      localStorage.setItem('theme-color', this.themeColor);
    }
  }
    // get theme image
    _getThemeImage(){
      const localStorageThemeImage = localStorage.getItem('theme-image');
      // alert(localStorageThemeImage);
      if(localStorageThemeImage && localStorageThemeImage!=''){
        this.themeImage = localStorageThemeImage;
      }else{
        localStorage.setItem('theme-image', this.themeImage);
      }
    }


  load(): Observable<HttpResponse<any>> {
    return this.http.get<any>(this.serverPath+'/api/v1/get_theme', httpOptions).pipe(map(res => {
      let data = res.body.data;
      // console.log(data);
      if(data.color_scheme && data.color_scheme!=''){
        localStorage.setItem('prefers-color', data.color_scheme);
      }
      if(data.theme_color && data.theme_color!=''){
        localStorage.setItem('theme-color', data.theme_color);
      }
      if(data.theme_image && data.theme_image!=''){
        localStorage.setItem('theme-image', data.theme_image);
        this.themeImage=data.theme_image;
      }
      this._getColorScheme(); // for color scheme like dark/ light
      this._getThemeColor(); // for theme color : red green blue
      this._getThemeImage();
      // dynamic add class in body tag for apply color scheme 
      // console.log(this.colorSchemePrefix + this.colorScheme + (this.themeColor ? '-'+this.themeColor :''));
      this.renderer.addClass(
        document.body,
        this.colorSchemePrefix + this.colorScheme + (this.themeColor ? '-'+this.themeColor :'')
      );
      return res;
    }));
  }
  // for not logged in user
  load_unauth(){
    this._getColorScheme(); // for color scheme like dark/ light
    this._getThemeColor(); // for theme color : red green blue
    this.renderer.addClass(
      document.body,
      this.colorSchemePrefix + this.colorScheme + (this.themeColor ? '-'+this.themeColor :'')
    );
  }

  // for update theme color
  update_theme_color(color: any): Observable<HttpResponse<any>>{
    this.themeColor=color;
    localStorage.setItem('theme-color', color);
    let colorScheme=this.colorScheme ? this.colorScheme:'dark';
    return this.update(colorScheme);
  }
  update_theme_image(image:any): Observable<HttpResponse<any>>{
    localStorage.setItem('theme-image', image);
    this.themeImage = image;
    return this.chatService.POST('/api/v1/update_theme', {themeImage: this.themeImage});
  }

  // update schema / theme color
  update(scheme: string): Observable<HttpResponse<any>> {
    this._setColorScheme(scheme);
    // Remove the old color-scheme class
    const body = document.body;
    const classes = body.classList;

    for (let i = classes.length - 1; i >= 0; i--) {
      if (classes[i].startsWith(this.colorSchemePrefix)) {
        this.renderer.removeClass(body, classes[i]);
      }
    }
    // Add the new / current color-scheme class
    this.renderer.addClass(document.body, this.colorSchemePrefix + scheme + (this.themeColor ? '-'+this.themeColor :'') );
    // update on db
    return this.chatService.POST('/api/v1/update_theme', {theme: this.themeColor,scheme: scheme,});
  }

  // get current schema color
  currentActive() {
    return this.colorScheme;
  }

  // get current theme color
  currentTheme_color(){
    return this.themeColor;
  }
  // get current theme image
  currentThemeImage(){
    return this.themeImage;
  }
}
