const STORAGE_KEY="cutoff-budget-tracker-v1";
const $=id=>document.getElementById(id);
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
let state={budget:0,options:[{name:"Option 1",amount:""},{name:"Option 2",amount:""}]};
try{
 const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
 if(saved&&Array.isArray(saved.options))state={...state,...saved};
}catch(e){}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function calculate(){
 const budget=Math.max(0,Number(state.budget)||0);
 const expenses=state.options.reduce((sum,item)=>sum+Math.max(0,Number(item.amount)||0),0);
 const balance=budget-expenses;
 $("remainingTop").textContent=money(balance);
 $("totalExpenses").textContent=money(expenses);
 $("totalBalance").textContent=money(balance);
 $("balanceRow").classList.toggle("negative",balance<0);
}
function render(){
 $("budget").value=state.budget;
 const wrap=$("options");wrap.replaceChildren();
 state.options.forEach((item,index)=>{
  const row=document.createElement("div");row.className="option";
  const name=document.createElement("input");name.type="text";name.maxLength=45;name.placeholder="Option name";name.value=item.name;name.setAttribute("aria-label",`Option ${index+1} name`);
  name.addEventListener("input",()=>{state.options[index].name=name.value;save()});
  const dash=document.createElement("span");dash.className="dash";dash.textContent="-";
  const amountWrap=document.createElement("div");amountWrap.className="amount";
  const peso=document.createElement("span");peso.textContent="₱";
  const amount=document.createElement("input");amount.type="number";amount.min="0";amount.step="0.01";amount.placeholder="0.00";amount.value=item.amount;amount.setAttribute("aria-label",`${item.name||"Option"} amount`);
  amount.addEventListener("input",()=>{state.options[index].amount=amount.value;save();calculate()});
  amountWrap.append(peso,amount);
  const remove=document.createElement("button");remove.type="button";remove.className="remove";remove.textContent="×";remove.title="Remove option";remove.setAttribute("aria-label",`Remove ${item.name||"option"}`);
  remove.addEventListener("click",()=>{state.options.splice(index,1);save();render()});
  row.append(name,dash,amountWrap,remove);wrap.append(row);
 });
 calculate();
}
$("budget").addEventListener("input",()=>{state.budget=Math.max(0,Number($("budget").value)||0);save();calculate()});
$("addOption").addEventListener("click",()=>{
 const n=state.options.length+1;
 state.options.push({name:`Option ${n}`,amount:""});
 save();render();
 const fields=$("options").querySelectorAll(".option input");
 fields[fields.length-2].focus();
});
render();
