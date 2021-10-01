import smtplib
from datetime import datetime
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import StringIO

import pandas as pd
from flask import jsonify

from definitions import SMTP_SERVER, USERNAME, PASSWORD, DOMAIN_APPLI, SIGNATURE, APPNAME


#Retourne la date du jour en secondes
def now():
    rc= datetime.now(tz=None).timestamp()
    return rc

start=now()
store_log=""
def log(text:str,sep='\n'):
    global store_log
    delay=int(now()-start)
    line:str=str(int(delay/60))+":"+str(delay % 60)+" : "+text
    print(line)
    store_log = line+sep+store_log[0:10000]
    return text

def getLog(sep="\n"):
    return store_log


def extract(text:str,start:str,end:str):
    start = text.index(start) + len(start)
    end = text[start:].index(end) + start
    return text[start:end]


def _decompose(number):
    while number:
        number, remainder = divmod(number - 1, 26)
        yield remainder

def base_10_to_alphabet(number):
    return ''.join(
        chr(ord('A') + part)
        for part in _decompose(number)
    )[::-1]

def base_alphabet_to_10(letters):
    """Convert an alphabet number to its decimal representation"""
    return sum(
            (ord(letter) - ord('A') + 1) * 26**i
            for i, letter in enumerate(reversed(letters.upper()))
    )


def str_to_hex(letters,zerox=True):
    if type(letters)==int:
        rc=hex(letters).replace("0x","")
    else:
        if type(letters)==list:letters=",".join(letters)
        rc=""
        for letter in letters:
            rc=rc+hex(ord(letter))[2:]

    if len(rc) % 2==1:rc="0"+rc
    rc=rc.upper()

    if zerox:
        return "0x"+rc
    else:
        return rc


def nbr_to_hex(number,zerox=True):
    rc=hex(number)
    if len(rc) % 2 ==1:rc=rc.replace("0x","0x0")
    rc=rc.upper()
    if zerox:
        return rc
    else:
        return rc.replace("0x","")


def hex_to_str(number):
    if not type(number)==str:
        number=hex(number)[2:]
    rc=""
    for i in range(0,len(number),2):
        rc=rc+chr(int(number[i:i+2],16))
    return rc




def open_html_file(name:str,replace=dict(),domain_appli=DOMAIN_APPLI):
    if not name.endswith("html"):name=name+".html"
    with open("./static/"+name, 'r', encoding='utf-8') as f: body = f.read()

    style="""
        <style>
        .button {
         border: none;
         background: #d9d9d9;
         color: #fff;
         padding: 10px;
         display: inline-block;
         margin: 10px 0px;
         font-family: Helvetica, Arial, sans-serif;
         font-weight: lighter;
         font-size: large;
         -webkit-border-radius: 3px;
         -moz-border-radius: 3px;
         border-radius: 3px;
         text-decoration: none;
        }

     .button:hover {
        color: #fff;
        background: #666;
     }
    </style>
    """

    replace["signature"]=SIGNATURE
    replace["appname"]=APPNAME
    replace["appdomain"]=domain_appli

    for k in list(replace.keys()):
        body=body.replace("{{"+k+"}}",str(replace.get(k)))

    body=body.replace("</head>",style+"</head>")

    # while "{{faq:" in body:
    #     index_faq=extract(body,"{{faq:","}}")
    #     faq=get_faqs(filters=index_faq,domain_appli=domain_appli,color="blue",format="html")
    #     body=body.replace("{{faq:"+index_faq+"}}",faq)

    return body



def send(socketio,event_name: str, dest="*", message: str = "", param: dict = {}):
    if not type(dest)==list:dest=[dest]
    for d in dest:
        body = dict({'to': d, 'message': message, 'param': param})
        rc = socketio.emit(event_name, body, broadcast=True)
        log("WebSocket.send de " + event_name + " à " + d);
    return rc




def send_mail(body:str,_to="paul.dudule@gmail.com",_from:str="reply@f80.fr",subject="",attach=None):
    if _to is None or len(_to)==0:return None
    with smtplib.SMTP(SMTP_SERVER, 587) as server:
        server.ehlo()
        server.starttls()
        try:
            log("Tentative de connexion au serveur de messagerie")
            server.login(USERNAME, PASSWORD+"!!")
            log("Connexion réussie. Tentative d'envoi")

            msg = MIMEMultipart()
            msg.set_charset("utf-8")
            msg['From'] = _from
            msg['To'] = _to
            msg['Subject'] = subject
            msg.attach(MIMEText(body,"html"))

            if not attach is None:
                part = MIMEBase('application', "octet-stream")
                part.set_payload(attach)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition',"attachment",filename="yourkey.pem")
                msg.attach(part)

            log("Send to "+_to+" <br><div style='font-size:x-small;max-height:300px>"+body+"</div>'")
            server.sendmail(msg=msg.as_string(), from_addr=_from, to_addrs=[_to])
            return True
        except Exception as inst:
            log("Echec de fonctionement du mail"+str(type(inst))+str(inst.args))
            return False


def translate(text:str,d:dict):
    if d is None:return ""
    for k in d.keys():
        text=text.replace("@"+k+"@",d[k])
    return text

#http://localhost:6660/api/nfts/?format=csv
def dictlist_to_csv(lst):
    df = pd.DataFrame.from_dict(lst)
    output = StringIO()
    df.to_csv(output)
    return output.getvalue()


def returnError(msg:str="Problème technique"):
    return msg,500
