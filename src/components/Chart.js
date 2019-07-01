import React, {PureComponent} from 'react';
import {Bar} from 'react-chartjs-2';
import Chart from "chart.js";
//import * as zoom from 'chartjs-plugin-zoom'

export default class ChartBar extends PureComponent{
    chartEl = null;
    constructor(props){
        super(props);
        this.state = {
            chartOpt: {
                scales: {
                    xAxes: [{
                        offset: true,
                        ticks: {
                            beginAtZero: true
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                },
                maintainAspectRatio: false,
                /*pan: {
                    enabled: false,
                    mode: 'x',
                    onPan: function({chart}) { console.log(`I was panned!!!`); }
                },
                zoom: {
                    enabled: true,
                    drag: false,
                    mode: 'x',
                    onZoom: function({chart}) { console.log(`I was zoomed!!!`); }
                }*/
            },
            chartData: {
                datasets: [{
                    backgroundColor: 'rgba(240, 99, 132, 0.6)',
                    borderColor: 'rgba(240, 99, 132, 1)',
                    borderWidth: 2,
                    hoverBorderWidth: 0
                }],
            }
        };

        this.chartRef = React.createRef();

        this.updateChartData = this.updateChartData.bind(this);
    }

    updateChartData(){
        const myChartRef = this.chartRef.current.getContext("2d");

        this.chartEl = new Chart(myChartRef, {
            type: "bar",
            data: {
                labels: this.props.labels,
                datasets: [{
                    label: this.props.label,
                    data: this.props.data,
                    backgroundColor: 'rgba(240, 99, 132, 0.6)',
                    borderColor: 'rgba(240, 99, 132, 1)',
                    borderWidth: 2,
                    hoverBorderWidth: 0
                }],
            },
            options: this.state.chartOpt
        });
    }

    /*componentDidMount() {
        this.updateChartData();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.updateChartData();
    }*/

    render(){
        const {chartOpt} = this.state;
        const chartData = {
            labels: this.props.labels,
            datasets: [{
                label: this.props.label,
                data: this.props.data,
                backgroundColor: 'rgba(240, 99, 132, 0.6)',
                borderColor: 'rgba(240, 99, 132, 1)',
                borderWidth: 2,
                hoverBorderWidth: 0
            }],
        };
        return (
            <React.Fragment>
            <Bar
                data={chartData}
                options={chartOpt}
            />
            {/*<canvas
                id={this.props.id}
                ref={this.chartRef}
            />*/}
            </React.Fragment>
        );
    }
}