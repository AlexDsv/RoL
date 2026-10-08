# Outil ponctuel : multiplie les stats d'un monstre. python3 scripts/rescale.py id hp ad spells
import re, sys
p='src/game/data/monsters.ts'
s=open(p).read()
id_,hp,ad,sp=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4])
i=s.index('id: "%s"'%id_); j=s.find('\n  },\n',i)
if j==-1: j=s.find('\n};',i)
b=s[i:j]
def ms(m):
    d=dict(re.findall(r'(\w+): ([\d.]+)', m.group(1)))
    d['hp']=str(round(float(d['hp'])*hp/50)*50); d['ad']=str(round(float(d['ad'])*ad))
    return 'monsterStats({ '+', '.join(f'{k}: {v}' for k,v in d.items())+' })'
b=re.sub(r'monsterStats\(\{ ([^}]*) \}\)', ms, b)
b=re.sub(r'\{ base: (\d+) \}', lambda m: '{ base: %d }'%(round(int(m.group(1))*sp/5)*5), b)
s=s[:i]+b+s[j:]
open(p,'w').write(s)
