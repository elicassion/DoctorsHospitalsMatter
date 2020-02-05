const LIGHT_RED = "#ff4081";
const RED = "#ff7043";
const DARK_RED = "#c63f17";
const LIGHT_YELLOW = "#ffff6b";
const YELLOW = "#fdd835";
const DARK_YELLOW = '#c6a700';
const LIGHT_GREEN = "#98ee99";
const GREEN = "#66bb6a";
const DARK_GREEN = "#338a3e";
const BLACK = "#111111";

let TOTAL_PEOPLE = 1000000; // total people
let INITIAL_INFECTED_PEOPLE = 10; // initial

let HIDDEN_PERIOD = 5;
let CURE_WORK_HOUR_PER_DAY_NEED = 2;
let CURE_DAY_NEED = 12;
let R0 = 0.5; // new infected per day
let R_DECAY = 0.01;
let DEATH_RATE = 0.01;
let DEATH_RATE_INCUR = 5;
let DEATH_WAIT = 2+HIDDEN_PERIOD;

let EQUIPMENT_CONSUME_RATE = 1; // per doctor per work hour
let INITIAL_DOCTOR_INFECTED_RATE = 0.01;
let DOCTOR_INFECTED_RATE_INCUR = 2.0;

let WORK_HOUR_LIMIT = 8; // hours per doctor per day

let EXTRA_WORK_HOUR_DECAY = 0.8;


// input variables
let work_hour = 8;
let equipment_supply = 10000;
let doctors = 2000;
let beds = 4000;
let equipment_store = 30000;



// variables
let R = R0;
let r_decay = R_DECAY;
let cur_days = 0;
let remain_beds = beds;
let remain_doctors = doctors;
let remain_equipment = equipment_store;
let remain_health_people = TOTAL_PEOPLE-INITIAL_INFECTED_PEOPLE;
let healed_people = 0;
let dead_people = 0;

let infected_people = [];
infected_people.push({infected: INITIAL_INFECTED_PEOPLE, in_hospital: 0});
let in_hospital_people = [];
in_hospital_people.push({healing: 0, healed: 0, heal_record: []});

// charts
let infected_heal_chart, bed_chart, equipment_chart, doctor_chart, bed_equipment_chart;
let infected_data = [];
let healed_data = [];
let dead_data = [];
let beds_data = [];
let equipment_data = [];
let days_data = [];
let doctors_data = [];

let simulation = undefined;

function getActualDoctorInfectedRate(total_pay_healing_power) {
    let equipment_needed = EQUIPMENT_CONSUME_RATE*total_pay_healing_power;
    let equipment_shortage;
    if (remain_equipment >= equipment_needed) {
        return INITIAL_DOCTOR_INFECTED_RATE;
    }
    else {
        equipment_shortage = remain_equipment/equipment_needed;
    }
    let actual_doctor_infected_rate = INITIAL_DOCTOR_INFECTED_RATE * DOCTOR_INFECTED_RATE_INCUR ** (1.0/equipment_shortage);
    console.log(equipment_shortage, actual_doctor_infected_rate);
    return actual_doctor_infected_rate >= 1.0 ? 1.0 : actual_doctor_infected_rate;
}

function getActualWorkHour() {
    let extra_actual_wh = 0;
    let decay = 1;
    if (work_hour <= WORK_HOUR_LIMIT) {
        return work_hour;
    }
    else {
        for (let i = WORK_HOUR_LIMIT; i < work_hour; ++i) {
            decay *= EXTRA_WORK_HOUR_DECAY;
            extra_actual_wh += decay;
        }
        return WORK_HOUR_LIMIT + extra_actual_wh;
    }
}

function receiveEquipment() {
    remain_equipment = Math.min(remain_equipment+equipment_supply, equipment_store);
}

function infection() {
    let new_infected = 0;
    for (let i = 0; i < cur_days; ++i) {
        let that_day = infected_people[i];
    // }
    // for (let that_day of infected_people) {
        new_infected += Math.max(0, Math.floor((that_day.infected - that_day.in_hospital) * R));
    }
    let actual_infected = Math.min(new_infected, remain_health_people);
    infected_people.push({infected: actual_infected, in_hospital: 0});
    remain_health_people -= actual_infected;
    R = Math.max(0.17, R-R_DECAY);
    // r_decay *= R_DECAY_DECAY;
}

function receive_patient() {
    // send to hospital
    let new_in_hospital = 0;
    for (let i = 0; i <= cur_days - HIDDEN_PERIOD; ++i) {
        let that_day = infected_people[i];
        // console.log(that_day);
        if (remain_beds <= 0) {
            break
        }
        let not_in_hospital = that_day.infected - that_day.in_hospital;
        if (remain_beds >= not_in_hospital) {
            new_in_hospital += not_in_hospital;
            remain_beds -= not_in_hospital;
            that_day.in_hospital += not_in_hospital;
            // that_day.infected = 0;
        }
        else {
            new_in_hospital += remain_beds;
            that_day.in_hospital += remain_beds;
            // that_day.infected -= remain_beds;
            remain_beds = 0;
        }
    }
    in_hospital_people.push({healing: new_in_hospital, heal_record: [], healed: 0});
}

function heal() {
    // heal
    let actual_wh = getActualWorkHour();
    let healing_power = remain_doctors * actual_wh;
    let total_pay_healing_power = 0;
    let no_more_healing_power = false;
    for (let that_day of in_hospital_people) {
        let needed_healing_power = that_day.healing * CURE_WORK_HOUR_PER_DAY_NEED;
        if (total_pay_healing_power + needed_healing_power >= healing_power) {
            no_more_healing_power = true;
        }
        let pay_healing_power = Math.min(needed_healing_power, healing_power - total_pay_healing_power);
        total_pay_healing_power += pay_healing_power;
        let get_healed_today = pay_healing_power / CURE_WORK_HOUR_PER_DAY_NEED;
        // console.log (that_day);
        that_day.heal_record.push(get_healed_today);
        if (that_day.heal_record.length >= CURE_DAY_NEED && that_day.healing > 0) {
            let healed_marks = [];
            let healed_nums = [];
            let i = 0;
            while (i < that_day.heal_record.length && that_day.healing > 0) {
                let heal_num = that_day.heal_record[i];
                if (heal_num >= 1){
                    healed_marks.push(i);
                    healed_nums.push(heal_num);
                    if (healed_marks.length >= CURE_DAY_NEED) {
                        let out_hospital = Math.min(that_day.healing, Math.floor(Math.min(...healed_nums)));
                        for (let j of healed_marks) {
                            that_day.heal_record[j] -= out_hospital;
                        }
                        that_day.healing -= out_hospital;
                        that_day.healed += out_hospital;
                        healed_people += out_hospital;
                        remain_beds += out_hospital;
                        i = 0;
                        continue;
                    }
                }
                ++i;
            }
        }
        if (no_more_healing_power) {
            break;
        }
    }
    let doctor_consume = Math.floor(total_pay_healing_power / actual_wh * getActualDoctorInfectedRate(total_pay_healing_power));
    if (doctor_consume <= 0) doctor_consume = 0;
    remain_doctors = remain_doctors - Math.floor(Math.min(doctor_consume, remain_doctors));
    remain_equipment = remain_equipment - Math.min(total_pay_healing_power * EQUIPMENT_CONSUME_RATE, remain_equipment);
}

function report() {
    console.log("[DAY " + cur_days + "] --" +
        " Infected: ", TOTAL_PEOPLE-remain_health_people,
        " Bed:", remain_beds,
        " Healed: ", healed_people,
        " Doctor: ", remain_doctors,
        " Equipment: ", remain_equipment);
    days_data.push(cur_days);
    infected_data.push(TOTAL_PEOPLE-remain_health_people);
    healed_data.push(healed_people);
    dead_data.push(dead_people);
    beds_data.push(remain_beds/beds);
    equipment_data.push(remain_equipment/equipment_store);
    doctors_data.push(remain_doctors/doctors);
    // console.log(infected_people);
    // console.log(in_hospital_people);
}

function draw() {
    infected_heal_chart.setOption({
        xAxis: {
            data: days_data
        },
        series: [{
            name: '累计感染人数',
            type: 'line',
            data: infected_data
        }, {
            name: '累计治愈数',
            type: 'line',
            data: healed_data
        }, {
            name: '累计死亡数',
            type: 'line',
            data: dead_data
        }]
    });
    bed_equipment_chart.setOption({
        xAxis: {
            data: days_data
        },
        series: [{
            name: '可用病床',
            type: 'line',
            data: beds_data
        }, {
            name: '可用医疗物资',
            type: 'line',
            data: equipment_data
        }, {
            name: '健康的医护人员',
            type: 'line',
            data: doctors_data
        }]
    });

    document.getElementById("infected-number").innerText = ""+(TOTAL_PEOPLE-remain_health_people);
    document.getElementById("healed-number").innerText = ""+healed_people;
    document.getElementById("death-number").innerText = ""+dead_people;
}

function death() {
    let new_dead = 0;
    for (let i = 0; i < cur_days-DEATH_WAIT; ++i) {
        let that_day = infected_people[i];
        // }
        // for (let that_day of infected_people) {
        let this_dead = Math.max(0, Math.floor((that_day.infected - that_day.in_hospital) * DEATH_RATE * (DEATH_RATE_INCUR * (cur_days-i))));
        that_day.infected -= this_dead;
        new_dead += this_dead;
    }

    for (let that_day of in_hospital_people) {
        console.log(that_day);
        let this_dead = Math.max(0, Math.floor(that_day.healing * DEATH_RATE));
        that_day.healing -= this_dead;
        remain_beds += this_dead;
        new_dead += this_dead;
    }
    dead_people += new_dead;
    // let actual_infected = Math.min(new_infected, remain_health_people);
    // infected_people.push({infected: actual_infected, in_hospital: 0});
    // remain_health_people -= actual_infected;

}



function update() {
    cur_days += 1;
    // if (cur_days >= HIDDEN_PERIOD + 3){
    //     receiveEquipment();
    // }
    receiveEquipment();
    death();
    infection();
    receive_patient();
    heal();
    report();
    draw();
}

window.onload = main;


function update_input_variable(obj) {
    console.log(obj);
    let input_id = obj.id;
    let value = parseInt(obj.value);
    document.getElementById("value-"+input_id).innerText = ""+value;
    switch (input_id) {
        case "input-work-hour":
            work_hour = value;
            break;
        case "input-equipment-supply":
            equipment_supply = value;
            break;
        case "input-doctors":
            doctors = value;
            break;
        case "input-beds":
            beds = value;
            break;
        case "input-equipment-store":
            equipment_store = value;
            break;
    }
}

function init_variables() {
    R = R0;
    r_decay = R_DECAY;
    cur_days = 0;
    dead_people = 0;
    remain_beds = beds;
    remain_doctors = doctors;
    remain_equipment = equipment_store;
    remain_health_people = TOTAL_PEOPLE-INITIAL_INFECTED_PEOPLE;
    healed_people = 0;

    infected_people = [];
    infected_people.push({infected: INITIAL_INFECTED_PEOPLE, in_hospital: 0});
    in_hospital_people = [];
    in_hospital_people.push({healing: 0, healed: 0, heal_record: []});
}

function start_sim() {
    // update_input_variable();
    init_variables();
    init_charts();
    simulation = setInterval(update, 300);
}

function stop_sim() {
    clearInterval(simulation);
}

function init_charts() {
    infected_data = [];
    healed_data = [];
    dead_data = [];
    beds_data = [];
    equipment_data = [];
    doctors_data = [];
    days_data = [];

    infected_heal_chart.setOption({
        tooltip: {},
        legend: {
            data:['累计感染人数', '累计治愈数', '累计死亡数']
        },
        xAxis: {
            data: []
        },
        yAxis: {},
        series: [{
            name: '累计感染人数',
            type: 'line',
            data: [],
            lineStyle: {
                width: 5,
                color: RED,
                opacity: 0.8
            },
            itemStyle: {
                color: RED
            }
        }, {
            name: '累计治愈数',
            type: 'line',
            data: [],
            lineStyle: {
                width: 5,
                color: GREEN,
                opacity: 0.8
            },
            itemStyle: {
                color: GREEN
            }
        }, {
            name: '累计死亡数',
            type: 'line',
            data: [],
            lineStyle: {
                width: 5,
                color: BLACK,
                opacity: 0.8
            },
            itemStyle: {
                color: BLACK
            }
        }]
    });

    bed_equipment_chart.setOption({
        tooltip: {},
        legend: {
            data:['可用病床', '可用医疗物资', '健康的医护人员']
        },
        xAxis: {
            data: []
        },
        yAxis: {},
        series: [{
            name: '可用病床',
            type: 'line',
            lineStyle: {
                width: 5,
                color: GREEN,
                opacity: 0.8
            },
            itemStyle: {
                color: GREEN
            },
            data: []
        }, {
            name: '可用医疗物资',
            type: 'line',
            lineStyle: {
                width: 5,
                color: YELLOW,
                opacity: 0.8
            },
            itemStyle: {
                color: YELLOW
            },
            data: []
        }, {
            name: '健康的医护人员',
            type: 'line',
            lineStyle: {
                width: 5,
                color: RED,
                opacity: 0.8
            },
            itemStyle: {
                color: RED
            },
            data: []
        }]
    });
}

function main() {
    infected_heal_chart = echarts.init(document.getElementById('infected-healed-chart'));
    bed_equipment_chart = echarts.init(document.getElementById('bed-equipment-chart'));
    // update_input_variable();
}

