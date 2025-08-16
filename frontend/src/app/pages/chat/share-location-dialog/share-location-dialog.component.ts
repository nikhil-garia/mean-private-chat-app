import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
declare const L: any;
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SocketService } from '../../../services/socket.service';
import { LocationService } from '../../../services/location.service';
@Component({
  selector: 'app-share-location-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIcon, MatTooltipModule],
  templateUrl: './share-location-dialog.component.html',
  styleUrl: './share-location-dialog.component.scss',
  styles: [`
    @import "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";  /* Import Leaflet CSS directly here */
  `]
})
export class ShareLocationDialogComponent implements OnInit {
  latitude: any;
  longitude: any;
  constructor(
    public dialogRef: MatDialogRef<ShareLocationDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private socketService: SocketService, private locationService:LocationService, private elementRef: ElementRef, private cdr: ChangeDetectorRef
    ) {};
  location_cord:any=[];
  selectedCord:any=[];

  
  private map: any; //: L.Map | undefined;
  private satelliteLayer: any; //L.TileLayer | undefined;
  private streetLayer: any; //L.TileLayer | undefined;
  private currentLayer: any;

  ngOnInit() : void {
    this.loadLeafletScript().then(() => {
      this.initializeMap();
    });
  }
  private initializeMap(): void {
    // Set up the Alidade Satellite tile layer
    // this.satelliteLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg?api_key=<your key>', {
    //   minZoom: 0,
    //   maxZoom: 20,
    //   attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // });
    // Set up a custom tile layer fetching tiles from the Express.js server
    this.satelliteLayer = L.tileLayer(`${this.locationService.serverPath}/api/v1/tiles/{z}/{x}/{y}`, {
      minZoom: 0,
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors'
    });

    // Set up the street view layer
    this.streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });
    navigator.geolocation.watchPosition((position)=>{
      
      const {latitude,longitude}=position.coords;
      this.socketService.emit('send-location',{latitude,longitude})
    },
    (error)=>{
      console.log(error);
    },{
      enableHighAccuracy:true,
      timeout:5000,
      maximumAge:0
    });

    // this.map = L.map('map').setView([0,0], 13);
    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //   maxZoom: 19,
    //   attribution:
    //     '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    // }).addTo(this.map);

    
    // Initialize map with the default layer (satelite view)
    this.map = L.map('map', {
      center: [0,0],
      zoom: 13,
      layers: [this.streetLayer]
    });

    // Set current layer to street view initially
    this.currentLayer = this.streetLayer;

    // for layer 
    const baseLayers = {
      "Satellite": this.satelliteLayer,
      "Streets": this.streetLayer
    };
    L.control.layers(baseLayers).addTo(this.map);

    const markers:any={};

    this.socketService.on('recieve-location',(data:any)=>{
      // console.log('recieve-location');
      const {id, latitude,longitude} = data;
      // console.log(latitude,longitude);
      // if (map != undefined) { map.remove(); } 
      this.map.setView([latitude,longitude], 13);
      if(markers[id]){
        markers[id].setLatLng([latitude,longitude]);
      }else{
        markers[id]= L.marker([latitude,longitude]).addTo(this.map);
      }
      markers[id].bindPopup(`<b>You! ${id}`).openPopup();
      
    });

    // this.socketService.on('user-disconnected',(id:any)=>{
    //   console.log(id);
    //   if(markers[id]){
    //     map.removeLayer(markers[id]);
    //     delete markers[id];
    //   }
    // })
    
    // return false;

    // on click label
    var popup = L.popup();
    const onMapClick = (e: { latlng: {lng: any;lat: any; toString: () => string}; }) => {
      // console.log(e);
      this.selectedCord=[e.latlng.lat,e.latlng.lng];
      // console.log(this.selectedCord);

      popup
        .setLatLng(e.latlng)
        .setContent(' ' + e.latlng.toString())
        .openOn(this.map);
    }

    this.map.on('click', onMapClick);
    // var circle = L.circle([51.508, -0.11], {
    //   color: 'red',
    //   fillColor: '#f03',
    //   fillOpacity: 0.5,
    //   radius: 500,
    // }).addTo(map);
    // circle.bindPopup('I am a circle.');
    // });
    this.cdr.detectChanges();
  }
  sendLocation(){
    let location = (this.selectedCord && this.selectedCord.length>0) ? this.selectedCord:this.location_cord;
    this.data.sendMessage('',this.data.intData.room.loggedUser,[],location);
  }
  /**
  * Dynamically loads the Leaflet JS script
  */
  private loadLeafletScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';  // External script source
      leafletScript.onload = () => {
        resolve();
      };
      leafletScript.onerror = () => {
        reject('Leaflet script could not be loaded.');
      };
      this.elementRef.nativeElement.appendChild(leafletScript);
    });
  }
}
