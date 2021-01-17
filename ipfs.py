import base64
import os
from datetime import datetime

import requests

class IPFS:
    addr=None

    def __init__(self, addr:str):
        self.addr=addr

    def add(self,body):
        url=self.addr+"/api/v0/add/"

        filename=str(datetime.now().timestamp())+".tmp"

        f=open('./temp/'+filename, 'wb')
        f.write(base64.b64decode(body.split("base64,")[1]))
        f.close()

        f = open('./temp/' + filename, 'rb')
        r = requests.post(url,files={'files': f})
        f.close()

        os.remove("./temp/"+filename)
        result=r.json()

        return result["Hash"]

