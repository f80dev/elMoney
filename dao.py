import sqlite3
from datetime import datetime

from Tools import log


class DAO:
    path=None

    def __init__(self,path:str):
        self.path=path

    def get_cursor(self):
        return sqlite3.connect(self.path).cursor();

    def add_contact(self, owner, email, addr):
        sql = "INSERT INTO email_addr (Owner,Address,Email) VALUES ('"+owner+"','" + addr + "','" + email + "')"
        return self.get_cursor().executescript(sql)

    def add_money(self,address,unity,owner,_public,transferable):
        _public="1" if _public else "0"
        transferable="1" if transferable else "0"

        now=str(datetime.now().timestamp()*1000)
        sql = "INSERT INTO Moneys (Address,Unity,dtCreate,Owner,Public,Transferable) " \
              "VALUES ('" + address + "','" + unity + "'," + now + ",'" + owner + "'," + _public + "," + transferable + ")"
        log("Execution de la requete : " + sql)
        return self.get_cursor().executescript(sql)

    def get_name(self, contract):
        sql = "SELECT Unity FROM Moneys WHERE Address='" + contract + "'"
        row =self.get_cursor().execute(sql).fetchall()
        if len(row) == 0: return None
        return row[0][0]


    def get_friends(self, owner):
        sql = "SELECT * FROM Contacts WHERE owner='" + owner + "'"
        rows = self.get_cursor().execute(sql).fetchall()
        return rows

    def get_moneys(self, addr):
        return self.get_cursor().execute("SELECT * FROM Moneys WHERE Public=TRUE or Owner='" + addr + "'").fetchall()

    def raz(self):
        c = self.get_cursor()
        c.executescript("DELETE FROM Moneys")
        c.executescript("DELETE FROM Contacts")
        return True




