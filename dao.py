import sqlite3
from datetime import datetime

from Tools import log


class DAO:
    path=None

    def __init__(self,path:str):
        self.path=path

    def get_cursor(self):
        return sqlite3.connect(self.path).cursor();



    def add_contact(self, email, addr=""):
        sql = "INSERT INTO Contacts (Address,Email) VALUES ('"+ addr + "','" + email + "')"
        log("Ajout d'une correspondance email => addr : execution de "+sql)
        return self.get_cursor().executescript(sql)




    def add_money(self,address:str,unity:str,owner:str,_public:bool,transferable:bool):
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
        sql = "SELECT * FROM Contacts WHERE Owner='" + owner + "'"
        rows = self.get_cursor().execute(sql).fetchall()
        return rows

    def get_moneys(self, addr):
        return self.get_cursor().execute("SELECT * FROM Moneys WHERE Public=1 or Owner='" + addr + "'").fetchall()

    def raz(self):
        c = self.get_cursor()
        c.executescript("DELETE FROM Moneys")
        c.executescript("DELETE FROM Contacts")
        return True

    def find_contact(self, email):
        rc=self.get_cursor().execute("SELECT * FROM Contacts WHERE email='" + email + "'").fetchone()
        if rc is None:return None
        return rc[0]

    def del_contact(self, email,owner):
        self.get_cursor().executescript("UPDATE Contacts SET Owner='' WHERE email='"+email+"' AND Owner='"+owner+"'")

    def get_money_by_name(self,unity):
        return self.get_cursor().execute("SELECT * FROM Moneys WHERE Public=1 and Unity='" + unity + "'").fetchone()




