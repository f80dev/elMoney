import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from definitions import SMTP_SERVER, USERNAME, PASSWORD, DOMAIN_APPLI


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

    for k in list(replace.keys()):
        body=body.replace("{{"+k+"}}",str(replace.get(k)))

    body=body.replace("</head>",style+"</head>")

    while "{{faq:" in body:
        index_faq=extract(body,"{{faq:","}}")
        faq=get_faqs(filters=index_faq,domain_appli=domain_appli,color="blue",format="html")
        body=body.replace("{{faq:"+index_faq+"}}",faq)

    return body


def send_mail(body:str,_to="paul.dudule@gmail.com",_from:str="ticketshare@f80.fr",subject=""):
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

            log("Send to "+_to+" <br><div style='font-size:x-small;max-height:300px>"+body+"</div>'")
            server.sendmail(msg=msg.as_string(), from_addr=_from, to_addrs=[_to])
            return True
        except Exception as inst:
            log("Echec de fonctionement du mail"+str(type(inst))+str(inst.args))
            return False
