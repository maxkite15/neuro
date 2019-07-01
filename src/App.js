import React, {Component} from 'react';
import './css/App.css';
import './css/bootstrap.min.css';
import './css/index.css';
import ChartBar from './components/Chart';
import {Bar} from "react-chartjs-2";
import stress from './testData/Stress.json';
import load from './testData/CognitiveLoad.json';

export default class App extends Component {
    constructor(props){
        super(props);
        this.state = {
            clientId: '',
            redirectUri: '',
            stateVal: '',
            tokenVal: document.getElementById('access_token').value,
            labels: [],
            stressData: [],
            lucidityData: [],
            cognitiveLoadData: [],
            courageData: [],
            chartsData: {},
            prevDaysChartsData: {},
            startTimeHour: 9,
            endTimeHour: 19,
            startDate: new Date(),
            selectedType: 'currDay'
        };

        this.getToken = this.getToken.bind(this);
        this.getData = this.getData.bind(this);
        this.getLabel = this.getLabel.bind(this);
        this.formatData = this.formatData.bind(this);
        this.initData = this.initData.bind(this);
        this.getChartData = this.getChartData.bind(this);
        this.getDataByTimeout = this.getDataByTimeout.bind(this);
        this.updateData = this.updateData.bind(this);
        this.getPreviousDayData = this.getPreviousDayData.bind(this);
        this.lastHour = -1;
        this.lastMinutes = -1;
    }

    getDateTimeStr(hour, minute, date){
        if(!date){
            date = new Date();
        }
        return this.getDateKey(date.getFullYear(), date.getMonth(), date.getDate())+'T'+this.getTimeKey(hour, minute)+':00';
    }

    componentDidMount() {
		console.log('ACCESS_TOKEN: ', document.getElementById('access_token').value);
		this.setState({
			tokenVal: document.getElementById('access_token').value
		});
        let self = this;
        let currDateTime = new Date();
        let currHour = currDateTime.getHours();
        let currMinute = currDateTime.getMinutes();
        let timeCond = `Start=${this.getDateTimeStr(this.state.startTimeHour, 0)}&Stop=${this.getDateTimeStr(currHour, currMinute)}`;
        let startData = this.initData(currHour, currMinute);
        this.updateData(startData, timeCond, 'chartsData')
            .then(result=>{
                console.log(result);
                self.getDataByTimeout(true);
            }, err=>{
                console.log(err);
            });
    }

    updateData(currData, timeCond, stateKey){
        let self = this;
        return new Promise((resolve, reject)=>{
            Promise.all([
                this.getChartData(`https://cdb.neurop.org/api/secured/eventdata/find?${timeCond}&Group=feedback&Class=trigger-negative&Kind=Stress_Flag`),
                this.getChartData(`https://cdb.neurop.org/api/secured/eventdata/find?${timeCond}&Group=feedback&Class=trigger-negative&Kind=CognitiveLoad_Flag`)
            ]).then(result=>{
                let stressData = result[0].length ? result[0] : stress;//убрать когда будут приходить непустые данные
                let cognitiveLoadData = result[1].length ? result[1] : load;
                self.formatData(stressData, currData, 'stress', stateKey==='prevDaysChartsData');
                self.formatData(cognitiveLoadData, currData, 'cognitiveLoad', stateKey==='prevDaysChartsData');
                self.setState({
                    [stateKey]: currData
                });
                resolve('Data updated');
            }, err=>{
				//убрать когда будут приходить непустые данные
				let stressData = stress;
                let cognitiveLoadData = load;
                self.formatData(stressData, currData, 'stress', stateKey==='prevDaysChartsData');
                self.formatData(cognitiveLoadData, currData, 'cognitiveLoad', stateKey==='prevDaysChartsData');
                self.setState({
                    [stateKey]: currData
                });
				//--------------------------------------------------------------------------------------------
                reject(err);
            });
        });
    }

    getPreviousDayData(currDate){
        currDate.setDate(currDate.getDate()-1);
        console.log('CURR DATE MONTH', currDate.getMonth());
        console.log('CURR DATE DAY', currDate.getDate());
        let key = this.getDateKey(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
        console.log('KEY=', key);
        let newData = this.state.prevDaysChartsData;
        newData[key] = {};
        let timeCond = `Start=${this.getDateTimeStr(this.state.startTimeHour, 0, currDate)}&Stop=${this.getDateTimeStr(this.state.endTimeHour, 0, currDate)}`;
        console.log(timeCond);
        this.updateData(newData, timeCond, 'prevDaysChartsData')
            .then(result=>{
                console.log('Success prev day data update: ', result);
            }, err=>{
                console.log('Prev day data update ERROR: ', err);
            });
    }

    increaseTimeKey(){
        if(this.lastMinutes<40){
            this.lastMinutes+=20;
        }else{
            this.lastHour++;
            this.lastMinutes=this.lastMinutes+20-60;
        }
    }

    getDataByTimeout(afterInit){
        let timeout = 20*60*1000;
        let self = this;
        if(afterInit){
            let currDateTime = new Date();
            let currHour = currDateTime.getHours();
            let currMinutes = currDateTime.getMinutes();
            timeout = (currHour < this.lastHour && this.lastMinutes===0 ? 60 - currMinutes : (currHour === this.lastHour && this.lastMinutes>currMinutes ? this.lastMinutes - currMinutes: 20))*60*1000;
        }
        setTimeout(()=>{
            let newChartsData = self.state.chartsData;
            let key = this.getTimeKey(self.lastHour, self.lastMinutes);
            newChartsData[key] = {};
            let timeCond = `Start=
                ${self.getDateTimeStr(self.lastMinutes===0 ? self.lastHour-1 : self.lastHour, self.lastMinutes===0 ? 40 : self.lastMinutes - 20)}
                &Stop=
                ${self.getDateTimeStr(self.lastHour, self.lastMinutes)}`;
            self.updateData(newChartsData, timeCond, 'chartsData')
                .then(result=>{
                    console.log(result);
                    onTimeout();
                }, err=>{
                    console.log(err);
                    onTimeout();
                });
        }, timeout)

        function onTimeout() {
            self.increaseTimeKey();
            if(self.lastHour < self.state.endTimeHour || self.lastHour === self.state.endTimeHour && self.lastMinutes===0) {
                self.getDataByTimeout(false);
            }else{
                setTimeout(()=>{
                    self.getPreviousDayData(new Date());
                    self.getDataByTimeout(false);
                },(24-self.state.endTimeHour+self.state.startTimeHour)*60*60*1000);
            }
        }
    }

    getToken(){
        const {clientId, redirectUri, stateVal} = this.state;
        let url = `http://cdb.neurop.org:8080/npe/connect/authorize?client_id=${clientId}&response_type=token&response_mode=form_post&redirect_uri=${redirectUri}&scope=api&state=${stateVal}`;
        fetch(url, {
            method: 'POST',
            redirect: 'follow',
            mode: 'no-cors'
        })
        .then(response=>{
            console.log('getToken response: ', response);
        })
        .catch(err=>{
          console.log('getToken error: ', err);
        });
    }

    getChartData(url){
        return new Promise((resolve, reject)=>{
			let params = {
				method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.state.tokenVal}`
                },
				mode: 'no-cors',
				cache: 'no-cache'
            };
			console.log('FETCH: ', params);
            fetch(url, params)
                .then(response=>{
                    if(response.status!==200) throw new Error(response.statusText);
                    console.log(response);
                    return response.json()
                })
                .then(res=>{
                    resolve(res);
                })
                .catch(err=>{
                    reject(err);
                })
        });
    }

    initData(currHour, currMinutes){
        let res = {};
        let hour = this.state.startTimeHour;
        let minutes = 20;
        let endHour = this.state.endTimeHour;
        while((hour < currHour || (hour === currHour&& minutes < currMinutes)) && hour < endHour) {
            let key = this.getTimeKey(hour, minutes);
            res[key] = {};
            if(minutes+20 >= 60){
                hour++;
                minutes=0;
            }else{
                minutes+=20;
            }
        }
        this.lastHour = hour;
        this.lastMinutes = minutes;
        return res;
    }

    getTimeKey(hour, minute){
        return (hour<10 ? '0'+hour : hour) + ':' + (minute<10 ? '0'+minute : minute);
    }

    getDateKey(year, month, day){
        return year+'-'+(month+1<10 ? '0'+(month+1) : month+1)+'-'+(day<10 ? '0'+day : day);
    }

    getLabel(){
        let currDate = new Date();
        let minutes = currDate.getMinutes();
        let seconds = currDate.getSeconds();
        return (minutes<10 ? '0'+minutes : minutes) + ':' + (seconds<10 ? '0'+seconds : seconds);
    }

    getData(){
        this.setState({
            labels: this.state.labels.concat([this.getLabel()]),
            stressData: this.state.stressData.concat([Math.floor(Math.random(0, 20)*100)]),
            lucidityData: this.state.lucidityData.concat([Math.floor(Math.random(0, 20)*100)]),
            cognitiveLoadData: this.state.cognitiveLoadData.concat([Math.floor(Math.random(0, 20)*100)]),
            courageData: this.state.courageData.concat([Math.floor(Math.random(0, 20)*100)])
        });
        let self = this;
        setTimeout(()=>{
            self.getData();
        }, 5000);
    }

    formatData(data, chartsData, type, isPrevDay){
        data.forEach(item=>{
            let iObj = JSON.parse(item.data);
			let recDate = new Date(iObj.t);
			let recHour = recDate.getMinutes()<40 ? recDate.getHours() : recDate.getHours()+1;
			let recMinutes = recDate.getMinutes()<20 ? 20 : (recDate.getMinutes()<40 ? 40 : 0);
			let key = this.getTimeKey(recHour, recMinutes);
			if(isPrevDay){
				key = this.getDateKey(recDate.getFullYear(), recDate.getMonth(), recDate.getDate());
			}
            if(iObj.s[0].v === 0 || iObj.s[0].v === 1){                
                if(chartsData[key]) {
                    if (!chartsData[key][type]) chartsData[key][type] = {val: 0, count: 0};
                    chartsData[key][type].val += iObj.s[0].v;
                    chartsData[key][type].count++;
                }
            }
			//работоспособность
			if(iObj.s[0].v === 0 || iObj.s[0].v === -2){
				if(chartsData[key]) {
                    if (!chartsData[key]['performance']) chartsData[key]['performance'] = {count: 0};
                    chartsData[key]['performance'].count++;
                }
			}
        });
    }



    render(){
        const {clientId, redirectUri, stateVal, tokenVal, labels, stressData, lucidityData, cognitiveLoadData, courageData, chartsData, prevDaysChartsData, selectedType} = this.state;
        let chartsLabels = [];
        let stressChartData = [];
        let cognitiveLoadChartData = [];
        let performanceChartData = [];
        if(selectedType === 'currDay') {
            //curr day data format
            for (let key in chartsData) {
                chartsLabels.push(key);
                if (chartsData[key].stress) {
                    stressChartData.push(Math.round(chartsData[key].stress.val / chartsData[key].stress.count));
                } else {
                    stressChartData.push(0);
                }
                if (chartsData[key].cognitiveLoad) {
                    cognitiveLoadChartData.push(Math.round(chartsData[key].cognitiveLoad.val / chartsData[key].cognitiveLoad.count));
                } else {
                    cognitiveLoadChartData.push(0);
                }
                if (chartsData[key].performance) {
                    performanceChartData.push(chartsData[key].performance.count);
                } else {
                    cognitiveLoadChartData.push(0);
                }
				
            }
        }else {
            //prev days data format
            for (let key in prevDaysChartsData) {
                chartsLabels.push(key);
                if (prevDaysChartsData[key] && prevDaysChartsData[key].stress) {
                    stressChartData.push(Math.round(prevDaysChartsData[key].stress.val / prevDaysChartsData[key].stress.count));
                } else {
                    stressChartData.push(0);
                }
                if (prevDaysChartsData[key] && prevDaysChartsData[key].cognitiveLoad) {
                    cognitiveLoadChartData.push(Math.round(prevDaysChartsData[key].cognitiveLoad.val / prevDaysChartsData[key].cognitiveLoad.count));
                } else {
                    cognitiveLoadChartData.push(0);
                }
                if (prevDaysChartsData[key] && prevDaysChartsData[key].performance) {
                    performanceChartData.push(prevDaysChartsData[key].performance.count);
                } else {
                    cognitiveLoadChartData.push(0);
                }
            }
        }
        return (
            <div className="App">
                <div className="authRow">
                  <form className="form-inline">
                    {/*<div className="form-group">
                      <label htmlFor="clientId"><b>Client ID:</b></label>
                      <input type="text" className="form-control" id="clientId" value={clientId} onChange={(e)=>{this.setState({clientId: e.target.value})}}/>
                    </div>
                    <div className="form-group" style={{marginLeft: '10px'}}>
                      <label htmlFor="redirectUri"><b>Redirect uri:</b></label>
                      <input type="text" className="form-control" id="redirectUri" value={redirectUri} onChange={(e)=>{this.setState({redirectUri: e.target.value})}}/>
                    </div>
                    <div className="form-group" style={{marginLeft: '10px'}}>
                      <label htmlFor="state"><b>State:</b></label>
                      <input type="text" className="form-control" id="state" value={stateVal} onChange={(e)=>{this.setState({stateVal: e.target.value})}}/>
                    </div>
                    <button type="button" className="btn btn-info" style={{marginLeft: '10px'}} onClick={this.getToken}>Get token</button>*/}
                      <div className="form-group">
                          <label htmlFor="tokenVal"><b>Access token:</b></label>
                          <input type="text" className="form-control" id="tokenVal" style={{minWidth: '400px'}}
                                 value={tokenVal}/>
                      </div>
                  </form>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1"
                           value="currDay" checked={selectedType==='currDay'} onChange={(e)=>this.setState({selectedType: 'currDay'})}/>
                        <label className="form-check-label" htmlFor="inlineRadio1">Текущий день</label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio2"
                           value="prevDays" checked={selectedType==='prevDays'} onChange={(e)=>this.setState({selectedType: 'prevDays'})}/>
                        <label className="form-check-label" htmlFor="inlineRadio2">Прошлые дни</label>
                </div>
                {selectedType === 'currDay' ?
                    <div className="Charts">
                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="lucidityBar" data={lucidityData} labels={chartsLabels}
                                      label='Сосредоточенность'/>
                        </div>

                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="stressBar" data={stressChartData} labels={chartsLabels} label='Стресс'/>
                        </div>


                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="cognitiveLoadBar" data={cognitiveLoadChartData} labels={chartsLabels}
                                      label='Когнитивная нагрузка'/>
                        </div>

                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="courageBar" data={performanceChartData} labels={chartsLabels}
                                      label='Работоспособность'/>
                        </div>
                    </div>
                    :
                    <div className="Charts">
                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="lucidityBar" data={lucidityData} labels={chartsLabels}
                                      label='Сосредоточенность'/>
                        </div>

                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="stressBar" data={stressChartData} labels={chartsLabels} label='Стресс'/>
                        </div>


                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="cognitiveLoadBar" data={cognitiveLoadChartData} labels={chartsLabels}
                                      label='Когнитивная нагрузка'/>
                        </div>

                        <div style={{width: '50%', height: '50%', float: 'left'}}>
                            <ChartBar id="courageBar" data={performanceChartData} labels={chartsLabels}
                                      label='Работоспособность'/>
                        </div>
                    </div>
                }
            </div>
        )
    }
}

/*function App() {
  return (
    <div className="App">
      <Chart/>
    </div>
  );
}

export default App;*/
