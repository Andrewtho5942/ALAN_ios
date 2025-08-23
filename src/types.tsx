export type RootStackParamList = {
  Home: undefined;
  Controller: undefined;
  Receiver: undefined;
  Settings: undefined;
};

export type Box = { ymin:number; xmin:number; ymax:number; xmax:number };
export type Det = { box: Box; score:number; label:string };
export type Track = {
    id:number; 
    label:string; 
    label_conf:number;
    box:Box;
    v:{dx:number; dy:number; ds:number};
    age:number;
    hits:number;
    misses:number;
    confirmed:boolean;
    lastSeenTs:number;
    locked: boolean;
};