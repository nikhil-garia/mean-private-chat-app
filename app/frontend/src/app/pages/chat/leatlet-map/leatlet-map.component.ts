import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit } from '@angular/core';
import { timeout } from 'rxjs';
import { LocationService } from '../../../services/location.service';
declare const L: any;

@Component({
  selector: 'app-leatlet-map',
  imports: [],
  templateUrl: './leatlet-map.component.html',
  styleUrl: './leatlet-map.component.scss',
  styles: [`
    @import "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  `]
})
export class LeatletMapComponent implements AfterViewInit  {
  private map: any; //: L.Map | undefined;
  private satelliteLayer: any; //L.TileLayer | undefined;
  private streetLayer: any; //L.TileLayer | undefined;
  private currentLayer: any;

  @Input() location: any | undefined;
  @Input() messageid: any | undefined;
  location_cord: any;
  mid: any = '';
  selectedCord: any = [];
  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef, private locationService:LocationService) {}
  ngAfterViewInit() : void {
    this.loadLeafletScript().then(() => {
      this.initializeMap();
    });
  }

  private initializeMap(): void {
    // Set up the Alidade Satellite tile layer
    // this.satelliteLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg', {
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
    setTimeout(() => {
      // this.map = L.map(this.messageid).setView(this.location,{ zoom: 13, layers: [this.satelliteLayer]});
      // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      //   zoom: 13,
      //   layers: [this.satelliteLayer],
      //   attribution:
      //     '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      // }).addTo(this.map);

      // Initialize map with the default layer (satelite view)
      this.map = L.map(this.messageid, {
        center: this.location,
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

      var marker = L.marker(this.location).addTo(this.map);
      // marker
      //   .bindPopup(
      //     '<b>Hello world!</b><br>Your are here' + this.location.toString()
      //   )
      //   .openPopup();
      // on click label
      var popup = L.popup();
      const onMapClick = (e: {
        latlng: { lng: any; lat: any; toString: () => string };
      }) => {
        // console.log(e);
        this.selectedCord = [e.latlng.lat, e.latlng.lng];
        // console.log(this.selectedCord);
  
        popup
          .setLatLng(e.latlng)
          .setContent(e.latlng.toString())
          .openOn(this.map);
      };
  
      this.map.on('click', onMapClick);
      this.cdr.detectChanges();
    }, 0);

    // var circle = L.circle([51.508, -0.11], {
    //   color: 'red',
    //   fillColor: '#f03',
    //   fillOpacity: 0.5,
    //   radius: 500,
    // }).addTo(map);
    // circle.bindPopup('I am a circle.');
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
  // Method to switch map view
  changeMapMode(mode: string): void {
    if (this.map) {
      // Remove the current layer
      this.map.removeLayer(this.currentLayer);

      // Set the new layer based on the selected mode
      if (mode === 'Satellite') {
        this.currentLayer = this.satelliteLayer;
      } else {
        this.currentLayer = this.streetLayer;
      }

      // Add the new layer to the map
      this.map.addLayer(this.currentLayer);
    }
  }
}
