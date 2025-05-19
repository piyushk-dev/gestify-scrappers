// #include <bits/stdc++.h>
// using namespace std;
// # define print(v) for(auto i : v) cout << i << " "; cout << "\n";
// # define int long long
// typedef vector<int>vi;

// bool miller_rabin(int n, int k) {
//     if (n < 2) return false;
//     if (n != 2 && n % 2 == 0) return false;
//     int r = 0, s = n - 1;
//     while (s % 2 == 0) {
//         s /= 2;
//         r++;
//     }
//     for (int i = 0; i < k; i++) {
//         int a = rand() % (n - 4) + 2;
//         int x = pow(a, s) % n;
//         if (x == 1 || x == n - 1) continue;
//         bool composite = true;
//         for (int j = 0; j < r - 1; j++) {
//             x = pow(x, 2) % n;
//             if (x == n - 1) {
//                 composite = false;
//                 break;
//             }
//         }
//         if (composite) return false;
//     }
//     return true;
// }

// /**
//  * 
//     b^(1728)===1mod1729
//  */


// void solve(){
    
// }

// signed main(){
//     ios :: sync_with_stdio(false);
//     cin.tie(0); cout.tie(0);
//     int tc=1;
//     cin>>tc;
//     while(tc--) solve();
//     return 0;
// }