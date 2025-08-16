import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpProgressEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  providedIn: 'root'
})
export class ChatService {
  serverPath: string;

  constructor(private http:HttpClient,private sanitizer: DomSanitizer) {
    this.serverPath=environment.apiUrl;
  }
  getConversation(convUrl:string,body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+convUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }getMsgByConversationById(convUrl:string, body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+convUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  getAttachementByConv(Url:string, body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+Url,body, httpOptions).pipe(map(user => {return user;}));
  }
  getAllAttachement(Url:string): Observable<HttpResponse<any>> {
    return this.http.get<any>(this.serverPath+Url, httpOptions).pipe(map(user => {return user;}));
  }
  getUnreadMsg(Url:string): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+Url, httpOptions).pipe(map(user => {return user;}));
  }
  // markAsRead(Url:string,body:any): Observable<HttpResponse<any>> {
  //   return this.http.post<any>(this.serverPath+Url,body, httpOptions).pipe(map(user => {return user;}));
  // }
  createConversation(url:string, body:any): Observable<HttpResponse<any>>  {
    return this.http.post<any>(this.serverPath+url, body, httpOptions).pipe(map(data => {
      return data;
    }));
  }
  getAllUser(Url:string): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+Url, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  getContactDetail(Url:string): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+Url, httpOptions).pipe(map(data => {
      return data;
    }));
  }
  // for upload file start
  uploadFile(file: File,Url:string): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();

    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.serverPath+Url}`, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req);
    // return this.http.request(req).pipe(
    //   map(event => this.getEventMessage(event, file))
    // );
  }
  private getEventMessage(event: HttpEvent<any>, file: File) {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        return this.fileUploadProgress(event);
      case HttpEventType.Response:
        return this.apiResponse(event);
      default:
        return `File "${file.name}" surprising upload event: ${event.type}.`;
    }
  }

  private fileUploadProgress(event: HttpProgressEvent) {
    const percentDone = event.total? Math.round(100 * event.loaded / event.total):0;
    return { progress: percentDone };
  }

  private apiResponse(event: HttpResponse<any>) {
    return event.body;
  }
  // upload file end

  // get all contact
  getAllContacts(Url:string): Observable<HttpResponse<any>> {
    return this.http.get<any>(this.serverPath+Url, httpOptions).pipe(map(user => {return user;}));
  }
  
  // get all bookmark
  getAllBookmark(Url:string): Observable<HttpResponse<any>> {
    return this.http.get<any>(this.serverPath+Url, httpOptions).pipe(map(user => {return user;}));
  }
   
  // delete bookmark by id
  deleteBookmark(Url:string): Observable<HttpResponse<any>> {
    return this.http.delete<any>(this.serverPath+Url, httpOptions).pipe(map(user => {return user;}));
  }

  // archive
  archive_conv(archivUrl:string, body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+archivUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  // Post data with body
  POST(archivUrl:string, body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+archivUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  // PUT data with body
  PUT(archivUrl:string, body:any): Observable<HttpResponse<any>> {
    return this.http.put<any>(this.serverPath+archivUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  // Post data with body
  GET(getUrl:string): Observable<HttpResponse<any>> {
    return this.http.get<any>(this.serverPath+getUrl, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  /**
   * Fetch filtered users with pagination
   * @param search The search string (name or email)
   * @param skip How many users to skip (for pagination)
   * @param limit How many users to fetch per request
   */
  getFilteredUsers(getUrl:string,search: string, skip: number, limit: number) {
    return this.http.get<any>(`${this.serverPath}`+getUrl, {
      params: {
        search,
        skip: skip.toString(),
        limit: limit.toString()
      }
    });
  }
  checkPic_privacy(user: { profilePhotoVisibility: any; _id?: any; },loggedUser:any){
    // console.log(user);
    if(!user.profilePhotoVisibility){
      return true;
    }else{
      let ret;
      if(user.profilePhotoVisibility=="everyone"){
        ret= true;
      }else if(user.profilePhotoVisibility=="contacts"){
        ret= loggedUser.contacts.includes(user._id);
      }else{
        ret= false;
      }
      return ret;
    }
  }


  private readonly iconMap: { [key: string]: string } = {
    'pdf': 'assets/icons/pdf-icon.png',
    'doc': 'assets/icons/word-icon.png',
    'docx': 'assets/icons/word-icon.png',
    'ppt': 'assets/icons/ppt-icon.png',
    'pptx': 'assets/icons/ppt-icon.png',
    'xls': 'assets/icons/excel-icon.png',
    'xlsx': 'assets/icons/excel-icon.png',
    'png': 'assets/icons/image-icon.png',
    'jpg': 'assets/icons/image-icon.png',
    'jpeg': 'assets/icons/image-icon.png',
    'txt': 'assets/icons/text-icon.png',
    'zip': 'assets/icons/zip-icon.png',
    // add other file types and icons as necessary
  };

  /**
   * Get the icon path based on file type
   * @param fileName the name of the file (with extension)
   * @returns the path to the icon
   */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return this.iconMap[extension] || 'assets/icons/default-icon.png';
  }
  AllowedExtension(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if(["pdf","doc","docx","ppt","pptx","xls","xlsx","txt","zip"].indexOf(extension)>=0){
      return true;
    }else{
      return false;
    }
  }
  isMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any)['opera'] ;
    return /android|iphone|ipad|iPod|opera mini|iemobile|mobile/i.test(userAgent.toLowerCase());
  }

  isDesktop(): boolean {
    return !this.isMobile();
  }
  getSanitizedMessage(htmlContent: string): SafeHtml {
    htmlContent = htmlContent.replace(/  /g, '&nbsp;&nbsp;');
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }
}