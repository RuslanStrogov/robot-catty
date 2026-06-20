#include <Arduino.h>
#define PIN_RED 3
#define PIN_GREEN 5
#define PIN_BLUE 6

int curR=0,curG=0,curB=0,tgtR=0,tgtG=0,tgtB=0;
int fadeStep=0,fadeTotal=0;
unsigned long lastFade=0;
unsigned long blinkTimer=0;
int blinkState=0;
int blinkCount=0;
int blinkDuration=0;
int blinkOn=0;

void setColor(int r,int g,int b){analogWrite(PIN_RED,r);analogWrite(PIN_GREEN,g);analogWrite(PIN_BLUE,b);curR=r;curG=g;curB=b;}
void startFade(int r,int g,int b,int s){tgtR=r;tgtG=g;tgtB=b;fadeTotal=s;fadeStep=0;lastFade=millis();}

void startBlink(int durationSec){
  blinkDuration=durationSec;
  blinkCount=0;
  blinkState=1;
  blinkOn=1;
  blinkTimer=millis();
  setColor(255,0,0);
  Serial.print("BLINK RED ");
  Serial.print(durationSec);
  Serial.println("s");
}

void updateBlink(){
  if(blinkDuration<=0)return;
  unsigned long now=millis();
  if(now-blinkTimer>=1000){
    blinkTimer=now;
    blinkOn=!blinkOn;
    if(blinkOn){
      setColor(255,0,0);
      blinkCount++;
    } else {
      setColor(0,0,0);
    }
    if(blinkCount>=blinkDuration){
      blinkDuration=0;
      blinkOn=0;
      setColor(0,0,0);
      Serial.println("BLINK DONE");
    }
  }
}

void updateFade(){
  if(fadeStep>=fadeTotal)return;
  unsigned long now=millis();
  if(now-lastFade<20)return;
  lastFade=now;fadeStep++;
  int r=curR+((tgtR-curR)*fadeStep)/fadeTotal;
  int g=curG+((tgtG-curG)*fadeStep)/fadeTotal;
  int b=curB+((tgtB-curB)*fadeStep)/fadeTotal;
  setColor(r,g,b);
}

void setup(){Serial.begin(9600);pinMode(PIN_RED,OUTPUT);pinMode(PIN_GREEN,OUTPUT);pinMode(PIN_BLUE,OUTPUT);setColor(0,0,0);}

void loop(){
  updateFade();
  updateBlink();
  if(Serial.available()){
    String cmd=Serial.readStringUntil('\n');cmd.trim();
    if(cmd.length()==0)return;
    int r,g,b;
    if(cmd.startsWith("FADE:")){
      int s;
      if(sscanf(cmd.c_str()+5,"%d,%d,%d,%d",&r,&g,&b,&s)==4){
        r=constrain(r,0,255);g=constrain(g,0,255);b=constrain(b,0,255);s=constrain(s,1,255);
        startFade(r,g,b,s);Serial.print("FADE ");Serial.print(r);Serial.print(" ");Serial.print(g);Serial.print(" ");Serial.print(b);Serial.print(" ");Serial.println(s);
      }else Serial.println("ERR:FADE:r,g,b,steps");
    }
    else if(cmd.startsWith("BLINK:")){
      int dur;
      if(sscanf(cmd.c_str()+6,"%d",&dur)==1){
        dur=constrain(dur,1,3600);
        startBlink(dur);
      }else Serial.println("ERR:BLINK:seconds");
    }
    else if(sscanf(cmd.c_str(),"%d,%d,%d",&r,&g,&b)==3){
      r=constrain(r,0,255);g=constrain(g,0,255);b=constrain(b,0,255);
      setColor(r,g,b);Serial.print("OK ");Serial.print(r);Serial.print(" ");Serial.print(g);Serial.print(" ");Serial.println(b);
    }
    else if(cmd=="OFF"){setColor(0,0,0);blinkDuration=0;Serial.println("OK OFF");}
    else if(cmd=="STATUS"){Serial.print("RGB=");Serial.print(curR);Serial.print(",");Serial.print(curG);Serial.print(",");Serial.println(curB);}
    else if(cmd.startsWith("PRESET:")){
      String n=cmd.substring(7);
      if(n=="RED"){setColor(255,0,0);Serial.println("OK PRESET RED");}
      else if(n=="GREEN"){setColor(0,255,0);Serial.println("OK PRESET GREEN");}
      else if(n=="BLUE"){setColor(0,0,255);Serial.println("OK PRESET BLUE");}
      else if(n=="WHITE"){setColor(255,255,255);Serial.println("OK PRESET WHITE");}
      else if(n=="YELLOW"){setColor(255,255,0);Serial.println("OK PRESET YELLOW");}
      else if(n=="CYAN"){setColor(0,255,255);Serial.println("OK PRESET CYAN");}
      else if(n=="MAGENTA"){setColor(255,0,255);Serial.println("OK PRESET MAGENTA");}
      else if(n=="ORANGE"){setColor(255,165,0);Serial.println("OK PRESET ORANGE");}
      else if(n=="PINK"){setColor(255,105,180);Serial.println("OK PRESET PINK");}
      else if(n=="PURPLE"){setColor(128,0,128);Serial.println("OK PRESET PURPLE");}
      else{Serial.print("ERR:unknown preset ");Serial.println(n);}
    }
    else{Serial.print("ERR:");Serial.println(cmd);}
  }
}
