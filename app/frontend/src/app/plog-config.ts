import { PlogConfig } from "@gpeel/plog";

export const plogConfig: PlogConfig = {

    createComponent: ['color:green;', 'New-@Comp'],
  
    error: 'color:red; font-size:1rem;',
    warn: 'color:orange',
    info: 'color:blue',
    debug: 'color:limegreen;font-weight:bold',
  
    action: ['color:#8f72cf; font-weight:bold;', '@ACTION'], // to log inside Action method
    tu: ['color:blue; font-size:1rem;', 'TU'],
    errorState: ['color:#cf3c04', '@ERROR'], // to log error in Store
  
  };